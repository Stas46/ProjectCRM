#!/usr/bin/env node
/**
 * Скрипт для создания эталонных данных на основе OCR текстов
 * Анализирует OCR и создает JSON файлы с правильными значениями
 */

const fs = require('fs').promises;
const path = require('path');

const OCR_DIR = './test-invoices/ocr';
const INVOICES_DIR = './test-invoices';

// Эталонные данные на основе ручного анализа OCR
const referenceData = {
  '387.txt': {
    invoice_number: '387',
    invoice_date: '2024-11-06',
    total_amount: 54971.20,
    vat_amount: 9161.86,
    supplier_name: 'ООО "СМ Групп"',
    supplier_inn: '7817137245'
  },
  'doc17970620251009131414.txt': {
    invoice_number: '153',
    invoice_date: '2024-10-09',
    total_amount: 11936.41,
    vat_amount: 1989.40,
    supplier_name: 'ООО "АЛЮТЕХ"',
    supplier_inn: '7814075047'
  },
  'Счёт-19.txt': {
    invoice_number: '25110618',
    invoice_date: '2024-11-06',
    total_amount: 250000.00,
    vat_amount: 41666.67,
    supplier_name: 'ООО "Спектр"',
    supplier_inn: '7842205964'
  },
  'счет 5146 от 06.11.25.txt': {
    invoice_number: '5146',
    invoice_date: '2024-11-06',
    total_amount: 11200.00,
    vat_amount: 1866.66,
    supplier_name: 'ООО "ИФК-Спектр"',
    supplier_inn: '7810143850'
  },
  'Счет QR  79892.txt': {
    invoice_number: '79892',
    invoice_date: '2024-11-06',
    total_amount: null,  // Нужно проверить OCR
    vat_amount: null,
    supplier_name: 'АМР',
    supplier_inn: '7816315470'
  },
  'Счет на оплату № 277 от 05 ноября 2025 г.txt': {
    invoice_number: '277',
    invoice_date: '2024-11-05',
    total_amount: 500.00,
    vat_amount: null,
    supplier_name: 'АРДЕКС ГРУПП',
    supplier_inn: null  // Нужно найти в OCR
  },
  'Счет покупателю 00000009557 от 29.10.2025.txt': {
    invoice_number: '00000009557',
    invoice_date: '2024-10-29',
    total_amount: null,  // Нужно проверить OCR
    vat_amount: null,
    supplier_name: 'Ал-Профи',
    supplier_inn: '7814419097'
  },
  'Счет покупателю 00000009915 от 07.11.2025.txt': {
    invoice_number: '00000009915',
    invoice_date: '2024-11-07',
    total_amount: null,  // Нужно проверить OCR
    vat_amount: null,
    supplier_name: 'Ал-Профи',
    supplier_inn: '7839120887'
  },
  'Счет № 1010 от 12.10.2025.txt': {
    invoice_number: '1010',
    invoice_date: '2024-10-12',
    total_amount: 500.00,
    vat_amount: null,
    supplier_name: 'Банк Точка',
    supplier_inn: null  // Найти настоящий
  }
};

async function analyzeOcr(filename) {
  const ocrPath = path.join(OCR_DIR, filename);
  const text = await fs.readFile(ocrPath, 'utf-8');
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 Анализирую: ${filename}`);
  console.log('='.repeat(60));
  
  // Извлекаем ключевые данные из OCR
  const data = referenceData[filename] || {};
  
  // Ищем "Итого" и суммы
  const totalPatterns = [
    /Итого[:\s]*(\d[\d\s,\.]*\d)/gi,
    /Всего[:\s]+наименований[^,]+,\s*на\s*сумму\s*(\d[\d\s,\.]*\d)/gi,
    /Итого\s*к\s*оплате[:\s]*(\d[\d\s,\.]*\d)/gi,
    /на\s*сумму\s*(\d[\d\s,\.]*\d)\s*руб/gi
  ];
  
  let foundTotal = null;
  for (const pattern of totalPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const match = matches[matches.length - 1];
      const cleanNum = match[1].replace(/[\s,]/g, '').replace('.', '.');
      foundTotal = parseFloat(cleanNum);
      console.log(`  ✓ Найдена сумма: ${foundTotal} (паттерн: ${pattern.source.slice(0, 30)}...)`);
      break;
    }
  }
  
  // Ищем НДС
  const vatPatterns = [
    /в\s*т\.?\s*ч\.?\s*НДС[:\s]*(\d[\d\s,\.]*\d)/gi,
    /В\s*том\s*числе\s*НДС[:\s]*(\d[\d\s,\.]*\d)/gi,
    /НДС\s*20%[:\s]*(\d[\d\s,\.]*\d)/gi
  ];
  
  let foundVat = null;
  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match) {
      const cleanNum = match[1].replace(/[\s,]/g, '').replace('.', '.');
      foundVat = parseFloat(cleanNum);
      console.log(`  ✓ Найден НДС: ${foundVat}`);
      break;
    }
  }
  
  // Обновляем данные
  if (foundTotal && (!data.total_amount || data.total_amount === null)) {
    data.total_amount = foundTotal;
  }
  if (foundVat && (!data.vat_amount || data.vat_amount === null)) {
    data.vat_amount = foundVat;
  }
  
  // Выводим найденные данные
  console.log(`\n  Эталонные данные:`);
  console.log(`    Номер: ${data.invoice_number || '?'}`);
  console.log(`    Дата: ${data.invoice_date || '?'}`);
  console.log(`    Сумма: ${data.total_amount || '?'}`);
  console.log(`    НДС: ${data.vat_amount || '?'}`);
  console.log(`    Поставщик: ${data.supplier_name || '?'}`);
  console.log(`    ИНН: ${data.supplier_inn || '?'}`);
  
  return data;
}

async function createJsonFile(ocrFilename, data) {
  // Определяем имя исходного файла (без .txt)
  const baseName = ocrFilename.replace('.txt', '');
  
  // Ищем соответствующий файл в test-invoices
  const files = await fs.readdir(INVOICES_DIR);
  const matchingFile = files.find(f => {
    const nameWithoutExt = path.basename(f, path.extname(f));
    return nameWithoutExt === baseName;
  });
  
  if (!matchingFile) {
    console.log(`  ⚠️  Не найден исходный файл для ${baseName}`);
    return;
  }
  
  const jsonFilename = path.basename(matchingFile, path.extname(matchingFile)) + '.json';
  const jsonPath = path.join(INVOICES_DIR, jsonFilename);
  
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✅ Создан: ${jsonFilename}`);
}

async function main() {
  console.log('🚀 Создание эталонных данных\n');
  
  const ocrFiles = await fs.readdir(OCR_DIR);
  
  for (const filename of ocrFiles) {
    if (!filename.endsWith('.txt')) continue;
    
    try {
      const data = await analyzeOcr(filename);
      await createJsonFile(filename, data);
    } catch (error) {
      console.error(`  ❌ Ошибка: ${error.message}`);
    }
  }
  
  console.log('\n✅ Готово!');
}

main().catch(console.error);
