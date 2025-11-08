// ============================================
// API Endpoint для распознавания счетов
// Путь: src/app/api/smart-invoice/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import type { Invoice, CreateInvoice, ParsedInvoiceData } from '@/types/invoice';
import type { Supplier, CreateSupplier } from '@/types/supplier';

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
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `invoices/${fileName}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });
    
    if (error) {
      console.error('❌ Ошибка загрузки файла в Storage:', error);
      return null;
    }
    
    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(filePath);
    
    console.log(`✅ Файл загружен: ${urlData.publicUrl}`);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('❌ Ошибка uploadFileToStorage:', error);
    return null;
  }
}

// ============================================
// Функция: OCR через Google Vision
// ============================================
async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
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
// Функция: Парсинг через Python скрипт
// ============================================
async function parseInvoiceWithPython(text: string): Promise<ParsedInvoiceData> {
  try {
    const pythonScript = path.join(process.cwd(), 'ultimate_invoice_parser.py');
    
    // Создаем временный файл с текстом
    const tempTextFile = path.join(process.cwd(), 'temp', `ocr_${Date.now()}.txt`);
    await fs.writeFile(tempTextFile, text, 'utf-8');
    
    const command = `python "${pythonScript}" < "${tempTextFile}"`;
    
    const { stdout, stderr } = await execAsync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    
    // Удаляем временный файл
    await fs.unlink(tempTextFile).catch(() => {});
    
    if (stderr) {
      console.warn('⚠️ Python stderr:', stderr);
    }
    
    const parsed = JSON.parse(stdout);
    console.log('✅ Python парсинг завершен:', parsed);
    
    return {
      invoice_number: parsed.invoice_number || null,
      invoice_date: parsed.invoice_date || null,
      total_amount: parsed.total_amount ? parseFloat(parsed.total_amount) : null,
      vat_amount: parsed.vat_amount ? parseFloat(parsed.vat_amount) : null,
      supplier_name: parsed.supplier_name || null,
      supplier_inn: parsed.supplier_inn || null,
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
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 Файл: ${file.name} (${file.size} байт)`);
    
    // Шаг 1: Загружаем файл в Storage
    const fileUrl = await uploadFileToStorage(file);
    if (!fileUrl) {
      return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
    }
    
    // Шаг 2: OCR через Google Vision
    const buffer = Buffer.from(await file.arrayBuffer());
    const ocrText = await extractTextFromImage(buffer);
    
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
    };
    
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
