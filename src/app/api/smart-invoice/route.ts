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

const execAsync = promisify(exec);

// ============================================
// Конфигурация
// ============================================

// Google Vision API
const vision = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
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
async function uploadFileToStorage(file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `invoices/${fileName}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Определяем MIME-type
    // Для Excel файлов используем application/octet-stream, т.к. Supabase не поддерживает некоторые Excel MIME-типы
    let contentType = file.type;
    const isExcel = fileExt === 'xls' || fileExt === 'xlsx' || fileExt === 'xlsm';
    
    if (isExcel) {
      contentType = 'application/octet-stream';
    } else if (fileExt === 'pdf') {
      contentType = 'application/pdf';
    } else if (fileExt === 'jpg' || fileExt === 'jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExt === 'png') {
      contentType = 'image/png';
    }
    
    const { data, error } = await supabase.storage
      .from('invoice-files')
      .upload(filePath, buffer, {
        contentType: contentType,
        upsert: false,
      });
    
    if (error) {
      console.error('❌ Ошибка загрузки файла в Storage:', error);
      
      // Специальное сообщение для отсутствующего bucket
      if (error.message?.includes('Bucket not found') || (error as any).statusCode === '404') {
        throw new Error('Bucket "invoice-files" не найден в Supabase Storage. Проверьте настройки Storage');
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
    console.error('❌ Ошибка uploadFileToStorage:', error);
    throw error; // Пробрасываем ошибку дальше
  }
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
    const pythonExecutable = 'C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe';
    
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
    const pythonExecutable = 'C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe';
    
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
      if (code !== 0) {
        console.error(`❌ Python скрипт завершился с ошибкой (код ${code}):`, stderr);
        resolve({ success: false, error: stderr || 'Ошибка выполнения Python скрипта' });
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        console.error('❌ Ошибка парсинга JSON от Python:', error);
        console.error('Вывод:', stdout);
        resolve({ success: false, error: 'Ошибка парсинга результата Python скрипта' });
      }
    });
    
    python.on('error', (error) => {
      console.error('❌ Ошибка запуска Python процесса:', error);
      reject(error);
    });
  });
}

// ============================================
// Функция: OCR через Google Vision
// ============================================
async function extractTextFromImage(buffer: Buffer, isPdf: boolean = false): Promise<string> {
  try {
    // Если это PDF, сначала конвертируем в изображение
    if (isPdf) {
      console.log('📄 Конвертация PDF в изображение...');
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
    
    // Обычное изображение
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
    const pythonExecutable = 'C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe';
    
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
        if (code !== 0) {
          reject(new Error(stderr || 'Ошибка выполнения office_to_text.py'));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error('Ошибка парсинга JSON от office_to_text.py'));
        }
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
    
    const command = `python "${pythonScript}" --file "${tempTextFile}" --output-format json`;
    
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
    
    // Python возвращает вложенную структуру {invoice: {...}, contractor: {...}}
    return {
      invoice_number: parsed.invoice?.number || null,
      invoice_date: parsed.invoice?.date || null,
      total_amount: parsed.invoice?.total_amount ? parseFloat(parsed.invoice.total_amount) : null,
      vat_amount: parsed.invoice?.vat_amount ? parseFloat(parsed.invoice.vat_amount) : null,
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
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('project_id') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 Файл: ${file.name} (${file.size} байт)`);
    if (projectId) {
      console.log(`🔗 Привязка к проекту: ${projectId}`);
    }
    
    // Шаг 1: Загружаем файл в Storage (кроме Excel - их Storage не поддерживает)
    let fileUrl: string | null = null;
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isExcel = fileExt === 'xls' || fileExt === 'xlsx' || fileExt === 'xlsm';
    
    if (!isExcel) {
      try {
        fileUrl = await uploadFileToStorage(file);
      } catch (storageError) {
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
    } else {
      console.log('📊 Excel файл - обрабатываем без загрузки в Storage (Storage не поддерживает Excel)');
    }
    
    // Шаг 2: Получаем текст (OCR для PDF/изображений, извлечение для Excel)
    const buffer = Buffer.from(await file.arrayBuffer());
    let ocrText: string;
    
    if (isExcel) {
      // Для Excel используем office_to_text.py
      console.log('📊 Извлечение текста из Excel...');
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
    
    // Шаг 4: Получить или создать поставщика
    const supplierId = await getOrCreateSupplier(
      parsed.supplier_name || 'Неизвестный поставщик',
      parsed.supplier_inn
    );
    
    // Шаг 5: Создаем счет в БД
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
    
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert(newInvoice)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка создания счета:', error);
      return NextResponse.json({ error: 'Ошибка сохранения счета' }, { status: 500 });
    }
    
    console.log(`✅ [${requestId}] Счет создан: ${invoice.id}`);
    
    return NextResponse.json({
      success: true,
      invoice,
      parsed,
    });
    
  } catch (error) {
    console.error(`❌ [${requestId}] Ошибка:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Неизвестная ошибка' },
      { status: 500 }
    );
  }
}
