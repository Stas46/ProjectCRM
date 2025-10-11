import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

import { ImageAnnotatorClient } from '@google-cloud/vision';

// Инициализация Google Vision API
const vision = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

async function processImagesWithOCR(images: any[]) {
  const ocrResults = [];
  
  for (const image of images) {
    try {
      console.log(`🔍 [OCR] Обрабатываем страницу ${image.page}...`);
      
      // Конвертируем base64 в buffer
      const imageBuffer = Buffer.from(image.base64, 'base64');
      
      // Отправляем в Google Vision
      const [result] = await vision.textDetection({
        image: {
          content: imageBuffer,
        },
      });
      
      const detections = result.textAnnotations;
      let extractedText = '';
      
      if (detections && detections.length > 0) {
        extractedText = detections[0].description || '';
      }
      
      ocrResults.push({
        page: image.page,
        text: extractedText,
        wordsCount: extractedText.split(/\s+/).filter(w => w.length > 0).length,
        confidence: detections?.[0]?.confidence || 0
      });
      
      console.log(`✅ [OCR] Страница ${image.page}: ${extractedText.length} символов`);
      
    } catch (error) {
      console.error(`❌ [OCR] Ошибка обработки страницы ${image.page}:`, error);
      ocrResults.push({
        page: image.page,
        text: '',
        wordsCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return ocrResults;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🖼️ [PDF-CONVERTER] Запуск PyMuPDF конвертера с OCR');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dpi = formData.get('dpi') as string || '200';
    const useOCR = formData.get('useOCR') === 'true';
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 [PDF-CONVERTER] Файл: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB), OCR: ${useOCR}`);
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Поддерживаются только PDF файлы' }, { status: 400 });
    }
    
    // Создаем временный файл
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempId = uuidv4();
    const tempPdfPath = path.join(tempDir, `${tempId}.pdf`);
    
    // Сохраняем PDF во временный файл
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempPdfPath, pdfBuffer);
    
    console.log(`💾 [PDF-TO-PNG] Временный файл: ${tempPdfPath}`);
    
    // Путь к Python скрипту
    const scriptPath = path.join(process.cwd(), 'python-scripts', 'pdf_to_png.py');
    const pythonExecutable = 'C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe';
    
    // Запускаем Python скрипт
    const result = await runPdfToPngScript(pythonExecutable, scriptPath, tempPdfPath, parseInt(dpi));
    
    let ocrResults = null;
    
    // Если включен OCR, используем Google Vision
    if (useOCR && result.success && result.images) {
      console.log(`🔍 [PDF-CONVERTER] Запуск OCR для ${result.images.length} изображений`);
      ocrResults = await processImagesWithOCR(result.images);
    }
    
    // Удаляем временный файл
    try {
      await fs.unlink(tempPdfPath);
    } catch (error) {
      console.warn('⚠️ [PDF-CONVERTER] Не удалось удалить временный файл:', error);
    }
    
    if (!result.success) {
      console.error('❌ [PDF-CONVERTER] Ошибка Python скрипта:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Ошибка конвертации PDF в PNG' 
      }, { status: 500 });
    }
    
    console.log(`✅ [PDF-CONVERTER] Успешно конвертировано: ${result.page_count} страниц, ${result.total_size_kb}KB`);
    if (ocrResults) {
      console.log(`🔍 [PDF-CONVERTER] OCR завершен для ${ocrResults.length} изображений`);
    }
    
    // Возвращаем результат
    return NextResponse.json({
      success: true,
      filename: file.name,
      pageCount: result.page_count,
      totalSizeKb: result.total_size_kb,
      dpi: result.dpi,
      images: result.images,
      ocrResults: ocrResults
    });
    
  } catch (error: any) {
    console.error('❌ [PDF-TO-PNG] Критическая ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Критическая ошибка при конвертации PDF'
    }, { status: 500 });
  }
}

function runPdfToPngScript(pythonPath: string, scriptPath: string, pdfPath: string, dpi: number): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`🚀 [PDF-TO-PNG] Запуск: ${pythonPath} ${scriptPath} --dpi ${dpi}`);
    
    const args = [
      scriptPath,
      pdfPath,
      '--dpi', dpi.toString()
    ];
    
    const python = spawn(pythonPath, args);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Выводим прогресс в реальном времени
      if (output.includes('Converting') || output.includes('Page')) {
        console.log(`[PDF-TO-PNG] ${output.trim()}`);
      }
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      console.log(`🏁 [PDF-TO-PNG] Завершено с кодом: ${code}`);
      
      if (code !== 0) {
        console.error('❌ [PDF-TO-PNG] Stderr:', stderr);
        resolve({
          success: false,
          error: `Python script failed with code ${code}: ${stderr}`
        });
        return;
      }
      
      try {
        // Ищем JSON в выводе
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log(`📊 [PDF-TO-PNG] Результат: ${result.success ? 'успех' : 'ошибка'}`);
          resolve(result);
        } else {
          console.error('❌ [PDF-TO-PNG] JSON не найден в выводе');
          resolve({
            success: false,
            error: 'No JSON output found'
          });
        }
      } catch (parseError) {
        console.error('❌ [PDF-TO-PNG] Ошибка парсинга JSON:', parseError);
        console.error('❌ [PDF-TO-PNG] Stdout:', stdout);
        resolve({
          success: false,
          error: 'Failed to parse Python script output'
        });
      }
    });
    
    python.on('error', (error) => {
      console.error('❌ [PDF-TO-PNG] Ошибка запуска Python:', error);
      resolve({
        success: false,
        error: `Failed to start Python script: ${error.message}`
      });
    });
  });
}