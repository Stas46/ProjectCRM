#!/usr/bin/env node
/**
 * Скрипт для массового тестирования парсера счетов
 * 
 * Использование:
 *   node test-invoice-parser.js
 * 
 * Что делает:
 * 1. Находит все PDF в папке test-invoices/
 * 2. Конвертирует PDF → PNG → OCR → Парсинг
 * 3. Сравнивает с эталонными данными (если есть .json файл)
 * 4. Создает отчет test-results.md
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const TEST_DIR = './test-invoices';
const RESULTS_FILE = './test-results.md';
const PYTHON_PATH = 'C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe';

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

async function convertPdfToPng(pdfPath) {
  console.log(`📄 Конвертирую PDF: ${path.basename(pdfPath)}`);
  
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'python-scripts', 'pdf_to_png.py');
    const args = [pythonScript, pdfPath, '--dpi', '200'];
    
    const pythonProcess = spawn(PYTHON_PATH, args);
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`PDF conversion failed: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        if (result.success && result.images && result.images[0]) {
          const imageBuffer = Buffer.from(result.images[0].base64, 'base64');
          resolve(imageBuffer);
        } else {
          reject(new Error('No images in result'));
        }
      } catch (err) {
        reject(new Error(`Failed to parse JSON: ${err.message}`));
      }
    });
  });
}

async function convertExcelToText(excelPath) {
  console.log(`📊 Читаю Excel: ${path.basename(excelPath)}`);
  
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'python-scripts', 'office_to_text.py');
    const pythonProcess = spawn(PYTHON_PATH, [pythonScript, excelPath]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Excel чтение не удалось: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.text);
        }
      } catch (err) {
        reject(new Error(`Ошибка парсинга JSON: ${err.message}\nOutput: ${stdout}`));
      }
    });
  });
}

async function loadImageFile(imagePath) {
  console.log(`🖼️ Загружаю изображение: ${path.basename(imagePath)}`);
  return await fs.readFile(imagePath);
}

async function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') return 'pdf';
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) return 'image';
  if (['.xls', '.xlsx', '.xlsm'].includes(ext)) return 'excel';
  
  return 'unknown';
}

async function processFile(filePath) {
  const fileType = await getFileType(filePath);
  
  switch (fileType) {
    case 'pdf':
      return await convertPdfToPng(filePath);
    case 'image':
      return await loadImageFile(filePath);
    case 'excel':
      // Excel обрабатывается отдельно в testInvoice
      throw new Error('Excel файлы обрабатываются напрямую, не через OCR');
    default:
      throw new Error(`Неподдерживаемый тип файла: ${path.extname(filePath)}`);
  }
}

async function runOcr(imageBuffer, sourceFilename = null) {
  console.log('🔍 Запускаю OCR...');
  
  const vision = require('@google-cloud/vision');
  const client = new vision.ImageAnnotatorClient({
    keyFilename: './google-credentials.json'
  });
  
  const [result] = await client.textDetection({ image: { content: imageBuffer } });
  const text = result.fullTextAnnotation?.text || '';
  
  console.log(`✅ OCR извлек ${text.length} символов`);
  
  // Сохраняем OCR текст для анализа
  if (sourceFilename) {
    const ocrDir = path.join(process.cwd(), 'test-invoices', 'ocr');
    const fsSync = require('fs');
    if (!fsSync.existsSync(ocrDir)) {
      fsSync.mkdirSync(ocrDir, { recursive: true });
    }
    const ocrFilename = path.basename(sourceFilename, path.extname(sourceFilename)) + '.txt';
    const ocrPath = path.join(ocrDir, ocrFilename);
    await fs.writeFile(ocrPath, text, 'utf-8');
    console.log(`📝 OCR сохранен: ocr/${ocrFilename}`);
  }
  
  return text;
}

async function parseInvoice(text) {
  console.log('🤖 Парсю данные...');
  
  return new Promise((resolve, reject) => {
    const tempFile = path.join(process.cwd(), 'temp', `test_ocr_${Date.now()}.txt`);
    
    fs.writeFile(tempFile, text, 'utf-8').then(() => {
      const pythonScript = path.join(process.cwd(), 'ultimate_invoice_parser.py');
      const args = [pythonScript, '--file', tempFile, '--output-format', 'json'];
      
      const pythonProcess = spawn(PYTHON_PATH, args);
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', async (code) => {
        await fs.unlink(tempFile).catch(() => {});
        
        if (code !== 0) {
          reject(new Error(`Parser failed: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
    });
  });
}

async function loadExpected(filePath) {
  // Убираем расширение и добавляем .json
  const basePath = filePath.replace(/\.[^.]+$/, '');
  const jsonPath = basePath + '.json';
  
  try {
    const content = await fs.readFile(jsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null; // Нет эталонных данных
  }
}

function compareResults(parsed, expected) {
  if (!expected) {
    return { hasExpected: false };
  }
  
  const results = {
    hasExpected: true,
    matches: {},
    mismatches: {},
    missing: {},
  };
  
  const fields = ['invoice_number', 'invoice_date', 'total_amount', 'vat_amount', 'supplier_name', 'supplier_inn'];
  
  for (const field of fields) {
    const actualValue = field.startsWith('supplier_') 
      ? parsed.contractor?.[field.replace('supplier_', '')]
      : parsed.invoice?.[field];
    
    const expectedValue = expected[field];
    
    if (expectedValue === undefined) continue;
    
    if (actualValue === null || actualValue === undefined) {
      results.missing[field] = expectedValue;
    } else if (String(actualValue) === String(expectedValue)) {
      results.matches[field] = actualValue;
    } else {
      results.mismatches[field] = {
        expected: expectedValue,
        actual: actualValue,
      };
    }
  }
  
  return results;
}

async function testInvoice(filePath) {
  const filename = path.basename(filePath);
  const fileType = await getFileType(filePath);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${colors.blue}Тестирую: ${filename} [${fileType.toUpperCase()}]${colors.reset}`);
  console.log('='.repeat(60));
  
  const result = {
    filename,
    fileType,
    success: false,
    error: null,
    parsed: null,
    expected: null,
    comparison: null,
  };
  
  try {
    let ocrText;
    
    if (fileType === 'excel') {
      // Для Excel читаем текст напрямую без OCR
      ocrText = await convertExcelToText(filePath);
    } else {
      // 1. Получаем изображение (конвертируем PDF или загружаем картинку)
      const imageBuffer = await processFile(filePath);
      
      // 2. OCR
      ocrText = await runOcr(imageBuffer, filename);
    }
    
    // 3. Парсинг
    const parsed = await parseInvoice(ocrText);
    result.parsed = parsed;
    
    // 4. Загрузка эталонных данных
    const expected = await loadExpected(filePath);
    result.expected = expected;
    
    // 5. Сравнение
    const comparison = compareResults(parsed, expected);
    result.comparison = comparison;
    
    result.success = true;
    
    // Вывод результатов
    console.log(`\n${colors.green}✅ Распознано:${colors.reset}`);
    console.log(`  Номер: ${parsed.invoice?.number || 'не найден'}`);
    console.log(`  Дата: ${parsed.invoice?.date || 'не найдена'}`);
    console.log(`  Сумма: ${parsed.invoice?.total_amount || 'не найдена'}`);
    console.log(`  НДС: ${parsed.invoice?.vat_amount || 'не найден'}`);
    console.log(`  Поставщик: ${parsed.contractor?.name || 'не найден'}`);
    console.log(`  ИНН: ${parsed.contractor?.inn || 'не найден'}`);
    
    if (comparison.hasExpected) {
      const total = Object.keys(comparison.matches).length + 
                    Object.keys(comparison.mismatches).length + 
                    Object.keys(comparison.missing).length;
      const correct = Object.keys(comparison.matches).length;
      const accuracy = total > 0 ? (correct / total * 100).toFixed(1) : 0;
      
      console.log(`\n${colors.yellow}📊 Точность: ${accuracy}% (${correct}/${total})${colors.reset}`);
      
      if (Object.keys(comparison.mismatches).length > 0) {
        console.log(`\n${colors.red}❌ Неверно распознано:${colors.reset}`);
        for (const [field, values] of Object.entries(comparison.mismatches)) {
          console.log(`  ${field}: "${values.actual}" (ожидалось: "${values.expected}")`);
        }
      }
      
      if (Object.keys(comparison.missing).length > 0) {
        console.log(`\n${colors.yellow}⚠️ Не распознано:${colors.reset}`);
        for (const [field, value] of Object.entries(comparison.missing)) {
          console.log(`  ${field}: "${value}"`);
        }
      }
    }
    
  } catch (err) {
    result.error = err.message;
    console.log(`\n${colors.red}❌ Ошибка: ${err.message}${colors.reset}`);
  }
  
  return result;
}

async function generateReport(results) {
  let report = '# Отчет тестирования парсера счетов\n\n';
  report += `Дата: ${new Date().toLocaleString('ru-RU')}\n\n`;
  report += `Протестировано файлов: ${results.length}\n\n`;
  
  const successful = results.filter(r => r.success).length;
  const withExpected = results.filter(r => r.comparison?.hasExpected).length;
  
  // Группируем по типам файлов
  const byType = {
    pdf: results.filter(r => r.fileType === 'pdf').length,
    image: results.filter(r => r.fileType === 'image').length,
    excel: results.filter(r => r.fileType === 'excel').length,
  };
  
  report += `## Общая статистика\n\n`;
  report += `- 📋 Всего файлов: ${results.length}\n`;
  report += `  - 📄 PDF: ${byType.pdf}\n`;
  report += `  - 🖼️ Изображения: ${byType.image}\n`;
  report += `  - 📊 Excel: ${byType.excel}\n`;
  report += `- ✅ Успешно обработано: ${successful}/${results.length}\n`;
  report += `- 📋 С эталонными данными: ${withExpected}/${results.length}\n\n`;
  
  // Средняя точность
  const accuracies = results
    .filter(r => r.comparison?.hasExpected)
    .map(r => {
      const total = Object.keys(r.comparison.matches).length + 
                    Object.keys(r.comparison.mismatches).length + 
                    Object.keys(r.comparison.missing).length;
      const correct = Object.keys(r.comparison.matches).length;
      return total > 0 ? (correct / total * 100) : 0;
    });
  
  if (accuracies.length > 0) {
    const avgAccuracy = (accuracies.reduce((a, b) => a + b, 0) / accuracies.length).toFixed(1);
    report += `- 🎯 Средняя точность: ${avgAccuracy}%\n\n`;
  }
  
  report += `## Детальные результаты\n\n`;
  
  for (const result of results) {
    const typeIcon = result.fileType === 'pdf' ? '📄' : 
                     result.fileType === 'image' ? '🖼️' : 
                     result.fileType === 'excel' ? '📊' : '📁';
    
    report += `### ${typeIcon} ${result.filename}\n\n`;
    
    if (!result.success) {
      report += `❌ **Ошибка:** ${result.error}\n\n`;
      continue;
    }
    
    report += `**Распознанные данные:**\n\n`;
    report += `| Поле | Значение |\n`;
    report += `|------|----------|\n`;
    report += `| Номер счета | ${result.parsed.invoice?.number || '-'} |\n`;
    report += `| Дата | ${result.parsed.invoice?.date || '-'} |\n`;
    report += `| Сумма | ${result.parsed.invoice?.total_amount || '-'} |\n`;
    report += `| НДС | ${result.parsed.invoice?.vat_amount || '-'} |\n`;
    report += `| Поставщик | ${result.parsed.contractor?.name || '-'} |\n`;
    report += `| ИНН | ${result.parsed.contractor?.inn || '-'} |\n\n`;
    
    if (result.comparison?.hasExpected) {
      const total = Object.keys(result.comparison.matches).length + 
                    Object.keys(result.comparison.mismatches).length + 
                    Object.keys(result.comparison.missing).length;
      const correct = Object.keys(result.comparison.matches).length;
      const accuracy = total > 0 ? (correct / total * 100).toFixed(1) : 0;
      
      report += `**Точность:** ${accuracy}% (${correct}/${total})\n\n`;
      
      if (Object.keys(result.comparison.mismatches).length > 0) {
        report += `**❌ Неверно распознано:**\n\n`;
        for (const [field, values] of Object.entries(result.comparison.mismatches)) {
          report += `- **${field}:** "${values.actual}" (ожидалось: "${values.expected}")\n`;
        }
        report += `\n`;
      }
      
      if (Object.keys(result.comparison.missing).length > 0) {
        report += `**⚠️ Не распознано:**\n\n`;
        for (const [field, value] of Object.entries(result.comparison.missing)) {
          report += `- **${field}:** "${value}"\n`;
        }
        report += `\n`;
      }
    }
    
    report += `---\n\n`;
  }
  
  await fs.writeFile(RESULTS_FILE, report, 'utf-8');
  console.log(`\n${colors.green}✅ Отчет сохранен: ${RESULTS_FILE}${colors.reset}`);
}

async function main() {
  console.log(`${colors.blue}🚀 Запуск массового тестирования парсера счетов${colors.reset}\n`);
  
  try {
    // Находим все поддерживаемые файлы (PDF, изображения, Excel)
    const files = await fs.readdir(TEST_DIR);
    const supportedExtensions = [
      '.pdf',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
      '.xls', '.xlsx', '.xlsm'
    ];
    
    const invoiceFiles = files
      .filter(f => {
        const ext = path.extname(f).toLowerCase();
        return supportedExtensions.includes(ext);
      })
      .map(f => path.join(TEST_DIR, f));
    
    if (invoiceFiles.length === 0) {
      console.log(`${colors.yellow}⚠️ Файлы счетов не найдены в ${TEST_DIR}${colors.reset}`);
      console.log('Поддерживаемые форматы: PDF, JPG, PNG, GIF, BMP, WEBP, XLS, XLSX');
      console.log('Сохраните тестовые счета в эту папку и запустите скрипт снова.');
      return;
    }
    
    // Группируем по типам
    const filesByType = {
      pdf: invoiceFiles.filter(f => f.toLowerCase().endsWith('.pdf')),
      image: invoiceFiles.filter(f => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(f)),
      excel: invoiceFiles.filter(f => /\.(xls|xlsx|xlsm)$/i.test(f)),
    };
    
    console.log(`Найдено файлов:`);
    console.log(`  📄 PDF: ${filesByType.pdf.length}`);
    console.log(`  🖼️ Изображения: ${filesByType.image.length}`);
    console.log(`  📊 Excel: ${filesByType.excel.length}`);
    console.log(`  📋 Всего: ${invoiceFiles.length}\n`);
    
    // Тестируем каждый файл
    const results = [];
    for (const filePath of invoiceFiles) {
      const result = await testInvoice(filePath);
      results.push(result);
    }
    
    // Генерируем отчет
    await generateReport(results);
    
    console.log(`\n${colors.green}✅ Тестирование завершено!${colors.reset}`);
    
  } catch (err) {
    console.error(`${colors.red}❌ Критическая ошибка: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
