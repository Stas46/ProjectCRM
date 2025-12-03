// ============================================
// API Endpoint для распознавания счетов
// Путь: src/app/api/smart-invoice/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import type { Invoice, CreateInvoice, ParsedInvoiceData } from '@/types/invoice';
import type { Supplier, CreateSupplier } from '@/types/supplier';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

// ============================================
// Конфигурация
// ============================================

// Путь к Google credentials (относительно корня проекта)
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  path.join(process.cwd(), 'google-credentials.json');

// Google Vision API
const vision = new ImageAnnotatorClient({
  keyFilename: credentialsPath,
});

// Supabase с service_role ключом для записи
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// Функция: Получить или создать поставщика
// ============================================
async function getOrCreateSupplier(
  name: string, 
  inn: string | null
): Promise<string | null> {
  if (!name || name === 'Неизвестный поставщик') {
    return null;
  }
  
  console.log(`🏢 Проверяем поставщика: ${name} (ИНН: ${inn})`);
  
  try {
    // Ищем по ИНН (если есть)
    if (inn) {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id')
        .eq('inn', inn)
        .single();
      
      if (data && !error) {
        console.log(`✅ Найден по ИНН: ${data.id}`);
        return data.id;
      }
    }
    
    // Ищем по имени
    const { data, error } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', name)
      .single();
    
    if (data && !error) {
      console.log(`✅ Найден по имени: ${data.id}`);
      return data.id;
    }
    
    // Создаем нового поставщика
    const newSupplier: CreateSupplier = {
      name,
      inn: inn || undefined,
    };
    
    const { data: created, error: createError } = await supabase
      .from('suppliers')
      .insert(newSupplier)
      .select('id')
      .single();
    
    if (createError) {
      console.error('❌ Ошибка создания поставщика:', createError);
      return null;
    }
    
    console.log(`✅ Создан новый поставщик: ${created.id}`);
    return created.id;
    
  } catch (error) {
    console.error('❌ Ошибка в getOrCreateSupplier:', error);
    return null;
  }
}

// ============================================
// Функция: Загрузка файла в Storage
// ============================================
async function uploadFileToStorage(
  file: File,
  buffer: Buffer,
  invoiceNumber?: string,
  invoiceDate?: string
): Promise<string | null> {
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      
      // Если есть номер счета и дата, используем их в имени файла
      let fileName: string;
      if (invoiceNumber && invoiceDate) {
        // Очищаем номер счета от спецсимволов И кириллицы (Supabase Storage не поддерживает)
        const cleanNumber = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 20) || 'invoice';
        // Форматируем дату (только yyyy-mm-dd)
        const dateOnly = invoiceDate.split('T')[0];
        fileName = `${cleanNumber}_${dateOnly}_${timestamp}.${fileExt}`;
      } else {
        fileName = `${timestamp}-${randomStr}.${fileExt}`;
      }
      
      const filePath = `invoices/${fileName}`;
      
      // Определяем правильный MIME-type для всех типов файлов
      let contentType = file.type || 'application/octet-stream';
      const isExcel = fileExt === 'xls' || fileExt === 'xlsx' || fileExt === 'xlsm';
      
      // Определяем content-type на основе расширения файла
      // Для некоторых типов Supabase Storage требует application/octet-stream
      if (fileExt === 'pdf') {
        contentType = 'application/pdf';
      } else if (fileExt === 'xlsx') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (fileExt === 'xls') {
        // Supabase не поддерживает application/vnd.ms-excel, используем octet-stream
        contentType = 'application/octet-stream';
      } else if (fileExt === 'xlsm') {
        contentType = 'application/vnd.ms-excel.sheet.macroEnabled.12';
      } else if (fileExt === 'docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (fileExt === 'doc') {
        // Supabase не поддерживает application/msword, используем octet-stream
        contentType = 'application/octet-stream';
      } else if (fileExt === 'jpg' || fileExt === 'jpeg') {
        contentType = 'image/jpeg';
      } else if (fileExt === 'png') {
        contentType = 'image/png';
      } else if (fileExt === 'gif') {
        contentType = 'image/gif';
      } else if (fileExt === 'webp') {
        contentType = 'image/webp';
      }
      
      console.log(`📎 Загружаем файл: ${fileName} (${contentType})`);
      
      const { data, error } = await supabase.storage
        .from('invoice-files')
        .upload(filePath, buffer, {
          contentType: contentType,
          upsert: false,
        });
      
      if (error) {
        console.error(`❌ Ошибка загрузки файла в Storage (попытка ${attempt}/${maxRetries}):`, error);
        
        // Специальное сообщение для отсутствующего bucket
        if (error.message?.includes('Bucket not found') || (error as any).statusCode === '404') {
          throw new Error('Bucket "invoice-files" не найден в Supabase Storage. Проверьте настройки Storage');
        }
        
        lastError = error;
        
        // Если это не последняя попытка, ждём перед повтором
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // 1s, 2s, 3s
          console.log(`⏳ Повтор через ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return null;
      }
      
      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('invoice-files')
        .getPublicUrl(filePath);
      
      console.log(`✅ Файл загружен: ${urlData.publicUrl}`);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error(`❌ Ошибка uploadFileToStorage (попытка ${attempt}/${maxRetries}):`, error);
      lastError = error;
      
      // Если это сетевая ошибка и не последняя попытка, пробуем снова
      if (attempt < maxRetries && (error as any).code === 'ECONNRESET') {
        const delay = attempt * 1000;
        console.log(`⏳ Повтор через ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error; // Пробрасываем ошибку дальше
    }
  }

  // Если все попытки исчерпаны
  throw lastError || new Error('Не удалось загрузить файл после нескольких попыток');
}

// ============================================
// Функция: Конвертация PDF в изображение
// ============================================
// ============================================
// Функция: Конвертация PDF в изображения (все страницы)
// ============================================
async function convertPdfToImages(pdfBuffer: Buffer): Promise<any[]> {
  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const tempId = uuidv4();
  const tempPdfPath = path.join(tempDir, `${tempId}.pdf`);
  
  try {
    // Сохраняем PDF во временный файл
    await fs.writeFile(tempPdfPath, pdfBuffer);
    console.log(`💾 Временный PDF: ${tempPdfPath}`);
    
    // Путь к Python скрипту
    const scriptPath = path.join(process.cwd(), 'python-scripts', 'pdf_to_png.py');
    // Используем python3 для Linux/Mac, python для Windows
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    
    logger.info(`Конвертация PDF в PNG (все страницы)`, { tempId, dpi: 200 });
    
    // Запускаем Python скрипт
    const result = await runPdfToPngScript(pythonExecutable, scriptPath, tempPdfPath, 200);
    
    // Удаляем временный файл
    try {
      await fs.unlink(tempPdfPath);
    } catch (error) {
      console.warn('⚠️ Не удалось удалить временный файл:', error);
    }
    
    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || 'Не удалось конвертировать PDF');
    }

    console.log(`📄 PDF содержит ${result.images.length} страниц(ы)`);
    return result.images;
    
  } catch (error) {
    console.error('❌ Ошибка конвертации PDF:', error);
    logger.error('Ошибка конвертации PDF', { error: String(error), tempId });
    throw error;
  }
}

// ============================================
// Функция: Конвертация PDF в изображение (первая страница - deprecated)
// ============================================
async function convertPdfToImage(pdfBuffer: Buffer): Promise<Buffer> {
  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const tempId = uuidv4();
  const tempPdfPath = path.join(tempDir, `${tempId}.pdf`);
  
  try {
    // Сохраняем PDF во временный файл
    await fs.writeFile(tempPdfPath, pdfBuffer);
    console.log(`💾 Временный PDF: ${tempPdfPath}`);
    
    // Путь к Python скрипту
    const scriptPath = path.join(process.cwd(), 'python-scripts', 'pdf_to_png.py');
    // Используем python3 для Linux/Mac, python для Windows
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    
    logger.info(`Конвертация PDF в PNG (первая страница)`, { dpi: 200 });
    
    // Запускаем Python скрипт
    const result = await runPdfToPngScript(pythonExecutable, scriptPath, tempPdfPath, 200);
    
    // Удаляем временный файл
    try {
      await fs.unlink(tempPdfPath);
    } catch (error) {
      console.warn('⚠️ Не удалось удалить временный файл:', error);
    }
    
    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || 'Не удалось конвертировать PDF');
    }

    console.log(`📄 PDF содержит ${result.images.length} страниц(ы)`);
    
    // Если несколько страниц - объединяем их вертикально или берем все для OCR
    // Для простоты - возвращаем первую страницу, а OCR запустим на всех
    const firstPage = result.images[0];
    const imageBuffer = Buffer.from(firstPage.base64, 'base64');
    
    // Сохраняем все страницы для использования в OCR (если нужно)
    // TODO: В будущем можно обрабатывать все страницы через OCR отдельно
    
    console.log(`✅ PDF конвертирован в изображение (${imageBuffer.length} байт)`);
    return imageBuffer;
    
  } catch (error) {
    console.error('❌ Ошибка конвертации PDF:', error);
    throw error;
  }
}

function runPdfToPngScript(pythonPath: string, scriptPath: string, pdfPath: string, dpi: number): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Запуск Python конвертера PDF → PNG`);
    
    const args = [
      scriptPath,
      pdfPath,
      '--dpi', dpi.toString()
    ];
    
    const python = spawn(pythonPath, args);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      console.log(`🔍 Python завершен с кодом: ${code}`);
      console.log(`📤 STDOUT (${stdout.length} символов):`, stdout.substring(0, 500));
      console.log(`📤 STDERR (${stderr.length} символов):`, stderr.substring(0, 500));
      
      logger.info(`Python скрипт завершен`, { 
        code, 
        stdoutLength: stdout.length, 
        stderrLength: stderr.length,
        stdoutPreview: stdout.substring(0, 200),
        stderrPreview: stderr.substring(0, 200)
      });
      
      if (code !== 0) {
        console.error(`❌ Python скрипт завершился с ошибкой (код ${code}):`, stderr);
        logger.error(`Python скрипт завершился с ошибкой`, { code, stderr });
        resolve({ success: false, error: stderr || 'Ошибка выполнения Python скрипта' });
        return;
      }
      
      try {
        // Парсим весь stdout как JSON
        // Python может выводить многострочный JSON
        const result = JSON.parse(stdout.trim());
        logger.info(`Python результат распарсен успешно`, { success: result.success });
        resolve(result);
      } catch (error) {
        console.error('❌ Ошибка парсинга JSON от Python:', error);
        console.error('Вывод:', stdout);
        logger.error(`Ошибка парсинга JSON от Python`, { 
          error: String(error), 
          stdout: stdout.substring(0, 1000),
          stderr: stderr.substring(0, 1000)
        });
        resolve({ success: false, error: 'Ошибка парсинга результата Python скрипта' });
      }
    });
    
    python.on('error', (error) => {
      console.error('❌ Ошибка запуска Python процесса:', error);
      logger.error(`Ошибка запуска Python процесса`, { 
        error: String(error),
        pythonPath,
        scriptPath,
        pdfPath
      });
      reject(error);
    });
  });
}

// ============================================
// Функция: Извлечение текста из PDF через PyMuPDF (без OCR)
// ============================================
async function extractTextFromPdfDirect(buffer: Buffer): Promise<{ success: boolean; text?: string; needsOcr: boolean }> {
  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const tempId = uuidv4();
  const tempPdfPath = path.join(tempDir, `${tempId}.pdf`);
  
  try {
    await fs.writeFile(tempPdfPath, buffer);
    
    const scriptPath = path.join(process.cwd(), 'python-scripts', 'pdf_extract_text.py');
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    
    return new Promise((resolve) => {
      const python = spawn(pythonExecutable, [scriptPath, tempPdfPath, '--min-chars', '50']);
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => { stdout += data.toString(); });
      python.stderr.on('data', (data) => { stderr += data.toString(); });
      
      python.on('close', async (code) => {
        // Удаляем временный файл
        try { await fs.unlink(tempPdfPath); } catch {}
        
        if (code !== 0) {
          console.log('⚠️ PyMuPDF extraction failed, will use OCR');
          resolve({ success: false, needsOcr: true });
          return;
        }
        
        try {
          const result = JSON.parse(stdout.trim());
          if (result.success && !result.needs_ocr && result.text) {
            console.log(`✅ PyMuPDF извлёк ${result.char_count} символов напрямую (без OCR)`);
            resolve({ success: true, text: result.text, needsOcr: false });
          } else {
            console.log(`📄 PDF требует OCR: ${result.reason || 'нет текстового слоя'}`);
            resolve({ success: true, needsOcr: true });
          }
        } catch {
          resolve({ success: false, needsOcr: true });
        }
      });
      
      python.on('error', () => {
        resolve({ success: false, needsOcr: true });
      });
    });
  } catch (error) {
    console.error('❌ Ошибка извлечения текста из PDF:', error);
    return { success: false, needsOcr: true };
  }
}

// ============================================
// Функция: OCR через Google Vision
// ============================================
async function extractTextFromImage(buffer: Buffer, isPdf: boolean = false): Promise<string> {
  try {
    // Если это PDF, сначала пробуем извлечь текст напрямую (без OCR)
    if (isPdf) {
      console.log('📄 Пробуем извлечь текст из PDF напрямую (PyMuPDF)...');
      const directResult = await extractTextFromPdfDirect(buffer);
      
      // Если текст успешно извлечён — возвращаем его (OCR не нужен!)
      if (directResult.success && !directResult.needsOcr && directResult.text) {
        console.log('✅ Текст извлечён из PDF напрямую — OCR не потребовался!');
        return directResult.text;
      }
      
      // Если текста нет или его мало — используем OCR
      console.log('📄 Текстового слоя нет, конвертируем PDF в изображение для OCR...');
      const pdfResult = await convertPdfToImages(buffer);
      
      // Обрабатываем все страницы через OCR
      console.log(`📄 Обработка ${pdfResult.length} страниц через OCR...`);
      const allTexts: string[] = [];
      
      for (let i = 0; i < pdfResult.length; i++) {
        console.log(`📄 OCR страница ${i + 1}/${pdfResult.length}...`);
        const pageBuffer = Buffer.from(pdfResult[i].base64, 'base64');
        
        const [result] = await vision.textDetection({
          image: { content: pageBuffer },
        });
        
        const detections = result.textAnnotations;
        if (detections && detections.length > 0) {
          const pageText = detections[0].description || '';
          allTexts.push(pageText);
          console.log(`✅ Страница ${i + 1}: извлечено ${pageText.length} символов`);
        }
      }
      
      const fullText = allTexts.join('\n\n=== СЛЕДУЮЩАЯ СТРАНИЦА ===\n\n');
      console.log(`✅ Всего извлечено ${fullText.length} символов из ${pdfResult.length} страниц`);
      return fullText;
    }
    
    // Обычное изображение — всегда OCR
    const [result] = await vision.textDetection({
      image: { content: buffer },
    });
    
    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      console.warn('⚠️ OCR не обнаружил текста');
      return '';
    }
    
    const fullText = detections[0].description || '';
    console.log(`✅ OCR извлек ${fullText.length} символов`);
    return fullText;
    
  } catch (error) {
    console.error('❌ Ошибка Google Vision OCR:', error);
    throw error;
  }
}

// ============================================
// Функция: Извлечение текста из Excel
// ============================================
async function extractTextFromExcel(buffer: Buffer, filename: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const tempId = uuidv4();
  const fileExt = filename.split('.').pop()?.toLowerCase() || 'xlsx';
  const tempFilePath = path.join(tempDir, `${tempId}.${fileExt}`);
  
  try {
    // Сохраняем Excel во временный файл
    await fs.writeFile(tempFilePath, buffer);
    console.log(`💾 Временный Excel: ${tempFilePath}`);
    
    // Путь к Python скрипту
    const scriptPath = path.join(process.cwd(), 'python-scripts', 'office_to_text.py');
    const pythonExecutable = process.platform === 'win32' 
      ? 'python' 
      : 'python3';
    
    console.log(`🐍 Запуск Python: ${pythonExecutable} ${scriptPath}`);
    logger.info('Извлечение текста из Excel', { scriptPath, filename });
    
    // Запускаем Python скрипт
    const result = await new Promise<any>((resolve, reject) => {
      const python = spawn(pythonExecutable, [scriptPath, tempFilePath]);
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        console.log(`🔍 office_to_text.py завершен с кодом: ${code}`);
        console.log(`📤 STDOUT (${stdout.length} символов):`, stdout.substring(0, 500));
        console.log(`📤 STDERR (${stderr.length} символов):`, stderr.substring(0, 500));
        
        logger.info('Python office_to_text завершен', { 
          code, 
          stdoutLength: stdout.length, 
          stderrLength: stderr.length 
        });
        
        if (code !== 0) {
          logger.error('office_to_text.py завершился с ошибкой', { code, stderr });
          reject(new Error(stderr || 'Ошибка выполнения office_to_text.py'));
          return;
        }
        
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (error) {
          logger.error('Ошибка парсинга JSON от office_to_text.py', { 
            error: String(error), 
            stdout: stdout.substring(0, 1000) 
          });
          reject(new Error('Ошибка парсинга JSON от office_to_text.py'));
        }
      });
      
      python.on('error', (error) => {
        console.error('❌ Ошибка запуска office_to_text.py:', error);
        logger.error('Ошибка запуска office_to_text.py', { 
          error: String(error),
          pythonPath: pythonExecutable,
          scriptPath 
        });
        reject(error);
      });
    });
    
    // Удаляем временный файл
    try {
      await fs.unlink(tempFilePath);
    } catch (error) {
      console.warn('⚠️ Не удалось удалить временный файл:', error);
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    console.log(`✅ Извлечено ${result.text_length} символов из Excel`);
    return result.text || '';
    
  } catch (error) {
    console.error('❌ Ошибка извлечения текста из Excel:', error);
    throw error;
  }
}

// ============================================
// Функция: Парсинг через Python скрипт
// ============================================
async function parseInvoiceWithPython(text: string): Promise<ParsedInvoiceData> {
  try {
    const pythonScript = path.join(process.cwd(), 'ultimate_invoice_parser.py');
    
    // Создаем временный файл с текстом
    const tempTextFile = path.join(process.cwd(), 'temp', `ocr_${Date.now()}.txt`);
    await fs.writeFile(tempTextFile, text, 'utf-8');
    
    const command = `python3 "${pythonScript}" --file "${tempTextFile}" --output-format json`;
    
    const { stdout, stderr } = await execAsync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    
    // Удаляем временный файл
    await fs.unlink(tempTextFile).catch(() => {});
    
    if (stderr) {
      console.warn('⚠️ Python stderr:', stderr);
    }
    
    console.log('📄 Python stdout (первые 500 символов):', stdout.substring(0, 500));
    console.log('📏 Python stdout длина:', stdout.length);
    
    // Python скрипт может выводить отладочные сообщения, поэтому извлекаем только JSON
    // JSON начинается с { и заканчивается }
    const jsonStart = stdout.indexOf('{');
    const jsonEnd = stdout.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('JSON не найден в выводе Python скрипта');
    }
    
    const jsonString = stdout.substring(jsonStart, jsonEnd + 1);
    console.log('🔍 Извлеченный JSON:', jsonString.substring(0, 200));
    
    const parsed = JSON.parse(jsonString);
    console.log('✅ Python парсинг завершен:', parsed);
    
    // Вычисляем НДС если есть ставка но нет суммы
    let vatAmount = parsed.invoice?.vat_amount ? parseFloat(parsed.invoice.vat_amount) : null;
    const totalAmount = parsed.invoice?.total_amount ? parseFloat(parsed.invoice.total_amount) : null;
    const vatRate = parsed.invoice?.vat_rate ? parseFloat(parsed.invoice.vat_rate) : null;
    
    if (!vatAmount && vatRate && totalAmount) {
      // Формула: НДС = Сумма * Ставка / (100 + Ставка)
      // Например: 53845 * 20 / 120 = 8974.17
      vatAmount = Math.round((totalAmount * vatRate / (100 + vatRate)) * 100) / 100;
      console.log(`📊 Вычислен НДС: ${vatAmount} (ставка ${vatRate}%, сумма ${totalAmount})`);
    }
    
    // Python возвращает вложенную структуру {invoice: {...}, contractor: {...}}
    return {
      invoice_number: parsed.invoice?.number || null,
      invoice_date: parsed.invoice?.date || null,
      total_amount: totalAmount,
      vat_amount: vatAmount,
      supplier_name: parsed.contractor?.name || null,
      supplier_inn: parsed.contractor?.inn || null,
    };
    
  } catch (error) {
    console.error('❌ Ошибка Python парсинга:', error);
    throw error;
  }
}

// ============================================
// POST Handler: Загрузка и распознавание счета
// ============================================
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`\n📨 [${requestId}] Новый запрос на распознавание счета`);
  logger.info(`Новый запрос на распознавание счета`, { requestId });
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('project_id') as string | null;
    
    if (!file) {
      logger.error('Файл не найден в запросе', { requestId });
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 Файл: ${file.name} (${file.size} байт)`);
    logger.info(`Обработка файла`, { requestId, fileName: file.name, fileSize: file.size, projectId });
    
    if (projectId) {
      console.log(`🔗 Привязка к проекту: ${projectId}`);
    }
    
    // Шаг 1: Получаем буфер файла (arrayBuffer можно вызвать только раз!)
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isExcel = fileExt === 'xls' || fileExt === 'xlsx' || fileExt === 'xlsm';
    const isWord = fileExt === 'doc' || fileExt === 'docx';
    const isOfficeFile = isExcel || isWord;
    
    // Шаг 2: Получаем текст (OCR для PDF/изображений, извлечение для Office файлов)
    let ocrText: string;
    
    if (isOfficeFile) {
      // Для Excel и Word используем office_to_text.py
      const docType = isExcel ? 'Excel' : 'Word';
      console.log(`📄 Извлечение текста из ${docType}...`);
      ocrText = await extractTextFromExcel(buffer, file.name);
    } else {
      // Для PDF/изображений используем OCR
      const isPdf = file.type === 'application/pdf';
      ocrText = await extractTextFromImage(buffer, isPdf);
    }
    
    if (!ocrText) {
      return NextResponse.json({ error: 'Не удалось распознать текст' }, { status: 500 });
    }
    
    // Шаг 3: Парсинг данных через Python
    const parsed = await parseInvoiceWithPython(ocrText);
    
    // Шаг 4: Загружаем файл в Storage с умным именем (номер_дата_timestamp)
    let fileUrl: string | null = null;
    
    try {
      fileUrl = await uploadFileToStorage(
        file, 
        buffer,
        parsed.invoice_number || undefined,
        parsed.invoice_date || undefined
      );
      const fileType = isExcel ? 'Excel' : isWord ? 'Word' : 'PDF/Image';
      logger.info('Файл загружен в Storage', { requestId, fileUrl, fileType });
      console.log(`✅ Файл ${file.name} успешно загружен: ${fileUrl}`);
    } catch (storageError) {
      logger.error('Ошибка загрузки в Storage', { requestId, error: String(storageError) });
      const errorMessage = storageError instanceof Error ? storageError.message : 'Ошибка загрузки файла в Storage';
      console.error('❌ Storage error:', errorMessage);
      return NextResponse.json({ 
        error: errorMessage,
        details: 'Проверьте файл STORAGE-SETUP.md для инструкций по настройке'
      }, { status: 500 });
    }
    
    if (!fileUrl) {
      return NextResponse.json({ 
        error: 'Не удалось загрузить файл в Storage',
        details: 'Проверьте настройки Supabase Storage'
      }, { status: 500 });
    }
    
    // Шаг 5: Получить или создать поставщика
    const supplierId = await getOrCreateSupplier(
      parsed.supplier_name || 'Неизвестный поставщик',
      parsed.supplier_inn
    );
    
    // Шаг 6: Проверяем возможные дубликаты (по совпадению 2+ характеристик из 4)
    // Характеристики: номер счёта, поставщик, сумма, дата
    let possibleDuplicates: any[] = [];
    
    if (parsed.invoice_number && parsed.invoice_number !== 'Не распознан') {
      console.log(`🔍 Поиск возможных дубликатов...`);
      
      // Оптимизированный поиск: ищем только по номеру счёта или поставщику
      let query = supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_amount, supplier_id, file_url, suppliers(name)');
      
      // Добавляем фильтры для сужения поиска
      if (supplierId) {
        // Ищем счета с таким же номером ИЛИ поставщиком
        query = query.or(`invoice_number.eq.${parsed.invoice_number},supplier_id.eq.${supplierId}`);
      } else {
        // Только по номеру счёта
        query = query.eq('invoice_number', parsed.invoice_number);
      }
      
      const { data: candidates } = await query.limit(50);
      
      if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
          let matchCount = 0;
          const matches: string[] = [];
          
          // Проверка 1: Номер счёта
          if (candidate.invoice_number === parsed.invoice_number) {
            matchCount++;
            matches.push('номер');
          }
          
          // Проверка 2: Поставщик
          if (supplierId && candidate.supplier_id === supplierId) {
            matchCount++;
            matches.push('поставщик');
          }
          
          // Проверка 3: Сумма (с погрешностью 1%)
          if (parsed.total_amount && candidate.total_amount) {
            const diff = Math.abs(candidate.total_amount - parsed.total_amount);
            const tolerance = parsed.total_amount * 0.01;
            if (diff <= tolerance) {
              matchCount++;
              matches.push('сумма');
            }
          }
          
          // Проверка 4: Дата
          if (parsed.invoice_date && candidate.invoice_date === parsed.invoice_date) {
            matchCount++;
            matches.push('дата');
          }
          
          // Если совпадают 2+ характеристики — это возможный дубликат
          if (matchCount >= 2) {
            possibleDuplicates.push({
              id: candidate.id,
              invoice_number: candidate.invoice_number,
              invoice_date: candidate.invoice_date,
              total_amount: candidate.total_amount,
              supplier_name: (candidate.suppliers as any)?.name || 'Неизвестный',
              file_url: candidate.file_url,
              match_count: matchCount,
              matches: matches
            });
          }
        }
        
        if (possibleDuplicates.length > 0) {
          console.log(`⚠️ Найдено ${possibleDuplicates.length} возможных дубликатов`);
        }
      }
    }
    
    // Шаг 7: Создаем счет в БД (всегда создаём, но помечаем если есть дубликаты)
    const newInvoice: CreateInvoice = {
      supplier_id: supplierId || undefined,
      invoice_number: parsed.invoice_number || 'Не распознан',
      invoice_date: parsed.invoice_date || new Date().toISOString().split('T')[0],
      total_amount: parsed.total_amount || 0,
      vat_amount: parsed.vat_amount || undefined,
      file_url: fileUrl,
      project_id: projectId || undefined,
    };
    
    if (projectId) {
      console.log(`✅ Счет будет привязан к проекту: ${projectId}`);
    }
    
    console.log('📦 Данные счета для вставки:', JSON.stringify(newInvoice, null, 2));
    
    // Повторные попытки создания счета в БД (Шаг 8)
    let invoice = null;
    let lastError = null;
    const maxDbRetries = 3;
    
    for (let attempt = 1; attempt <= maxDbRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .insert(newInvoice)
          .select()
          .single();
        
        if (error) {
          console.error(`❌ Ошибка создания счета (попытка ${attempt}/${maxDbRetries}):`, error);
          lastError = error;
          
          // Если это не последняя попытка, ждём перед повтором
          if (attempt < maxDbRetries) {
            const delay = attempt * 1000;
            console.log(`⏳ Повтор создания счета через ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          return NextResponse.json({ error: 'Ошибка сохранения счета' }, { status: 500 });
        }
        
        invoice = data;
        break; // Успешно создали, выходим из цикла
        
      } catch (err) {
        console.error(`❌ Исключение при создании счета (попытка ${attempt}/${maxDbRetries}):`, err);
        lastError = err;
        
        if (attempt < maxDbRetries) {
          const delay = attempt * 1000;
          console.log(`⏳ Повтор создания счета через ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return NextResponse.json({ error: 'Ошибка сохранения счета' }, { status: 500 });
      }
    }
    
    if (!invoice) {
      console.error('❌ Не удалось создать счет после всех попыток');
      return NextResponse.json({ error: 'Ошибка сохранения счета' }, { status: 500 });
    }
    
    console.log(`✅ [${requestId}] Счет создан: ${invoice.id}`);
    
    // Отправка уведомления через n8n (асинхронно, не блокируем ответ)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      // Получаем название проекта если есть
      let projectName = null;
      if (projectId) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('title')
          .eq('id', projectId)
          .single();
        projectName = projectData?.title || null;
      }
      
      // Плоская структура для простоты использования в n8n
      const webhookData = {
        type: 'invoice_created',
        id: invoice.id,
        number: parsed?.invoice_number || invoice.invoice_number || '',
        date: parsed?.invoice_date || invoice.invoice_date || '',
        total_amount: parsed?.total_amount || invoice.total_amount || 0,
        supplier_name: parsed?.supplier_name || '',
        supplier_inn: parsed?.supplier_inn || '',
        project_id: projectId || null,
        project_name: projectName,
        file_url: invoice.file_url || '',
        timestamp: new Date().toISOString(),
      };
      console.log(`📧 Отправка в n8n:`, JSON.stringify(webhookData));
      
      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(webhookData),
      })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          console.error('⚠️ n8n webhook error:', res.status, text);
        } else {
          console.log('✅ n8n webhook success');
        }
      })
      .catch(err => console.error('⚠️ n8n webhook error:', err));
    }
    
    // Формируем ответ с информацией о дубликатах
    const response: any = {
      success: true,
      invoice,
      parsed,
    };
    
    // Если есть возможные дубликаты — добавляем их в ответ
    if (possibleDuplicates.length > 0) {
      response.possible_duplicates = possibleDuplicates;
      response.is_possible_duplicate = true;
      console.log(`⚠️ [${requestId}] Счёт создан, но найдено ${possibleDuplicates.length} возможных дубликатов`);
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`❌ [${requestId}] Ошибка:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error(`Критическая ошибка обработки счета`, { 
      requestId, 
      error: errorMessage,
      stack: errorStack
    });
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
