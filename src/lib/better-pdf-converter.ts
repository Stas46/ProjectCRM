/**
 * Улучшенный конвертер PDF в изображение
 * Сохраняет все стадии конвертации для отладки
 */

import fs from 'fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

interface PDFDebugResult {
  buffer: Buffer;
  publicUrl: string;
  enhancedUrl?: string;
  allPages?: string[];
  allEnhancedPages?: string[];
  errorMessage?: string;
  success: boolean;
}

/**
 * Конвертирует PDF в изображение с подробной отладкой
 */
export async function convertPdfWithBetterDebug(pdfBuffer: Buffer, fileName: string = 'unknown'): Promise<PDFDebugResult> {
  // Создаем уникальный идентификатор для файла
  const fileId = uuidv4();
  const sanitizedName = fileName.replace(/[^a-z0-9]/gi, '-');
  const baseName = `${sanitizedName}-${fileId}`;
  
  // Директории для хранения результатов
  const publicDir = path.join(process.cwd(), 'public', 'debug-images');
  const enhancedDir = path.join(publicDir, 'enhanced');
  
  // Создаем директории если их нет
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }
  if (!existsSync(enhancedDir)) {
    mkdirSync(enhancedDir, { recursive: true });
  }
  
  // Сначала сохраним исходный PDF для отладки
  const pdfPath = path.join(publicDir, `${baseName}.pdf`);
  const pdfPublicUrl = `/debug-images/${baseName}.pdf`;
  await fs.writeFile(pdfPath, pdfBuffer);
  
  try {
    // Проверяем, что PDF валидный
    let pageCount = 1;
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      pageCount = pdfDoc.getPageCount();
      
      if (pageCount === 0) {
        return createErrorResult(fileId, 'PDF не содержит страниц');
      }
      
      console.log(`PDF содержит ${pageCount} страниц`);
    } catch (pdfError) {
      return createErrorResult(fileId, `Невалидный PDF: ${(pdfError as Error).message}`);
    }
    
    // Конвертируем каждую страницу PDF отдельно
    const allImages: Buffer[] = [];
    const allPageUrls: string[] = [];
    const allEnhancedUrls: string[] = [];
    
    // Ограничиваем количество страниц для обработки
    const pagesToProcess = Math.min(pageCount, 5);
    
    for (let i = 0; i < pagesToProcess; i++) {
      try {
        // Создаем имена файлов для этой страницы
        const pageSuffix = pageCount > 1 ? `-page${i+1}` : '';
        const imageFileName = `${baseName}${pageSuffix}.png`;
        const enhancedFileName = `enhanced-${baseName}${pageSuffix}.png`;
        const imagePath = path.join(publicDir, imageFileName);
        const enhancedPath = path.join(enhancedDir, enhancedFileName);
        const imageUrl = `/debug-images/${imageFileName}`;
        const enhancedUrl = `/debug-images/enhanced/${enhancedFileName}`;
        
        // Конвертируем PDF в изображение
        const imageBuffer = await sharp(pdfBuffer, {
          page: i,
          pages: 1,
          density: 400 // Увеличиваем разрешение для лучшего качества
        })
        .toFormat('png', { quality: 100, compressionLevel: 9 })
        .toBuffer();
        
        // Сохраняем оригинальное изображение
        await fs.writeFile(imagePath, imageBuffer);
        allImages.push(imageBuffer);
        allPageUrls.push(imageUrl);
        
        // Создаем улучшенную версию для OCR
        const enhancedBuffer = await sharp(imageBuffer)
          .greyscale() // Преобразуем в оттенки серого
          .normalize() // Нормализуем контраст
          .threshold(128) // Бинаризация изображения
          .sharpen({ sigma: 1.5 }) // Увеличиваем резкость
          .toBuffer();
        
        // Сохраняем улучшенное изображение
        await fs.writeFile(enhancedPath, enhancedBuffer);
        allEnhancedUrls.push(enhancedUrl);
        
        console.log(`Страница ${i+1}/${pagesToProcess} успешно обработана`);
      } catch (pageError) {
        console.error(`Ошибка при обработке страницы ${i+1}:`, pageError);
        // Продолжаем с другими страницами
      }
    }
    
    if (allImages.length === 0) {
      return createErrorResult(fileId, 'Не удалось сконвертировать ни одну страницу PDF');
    }
    
    // Возвращаем результаты
    return {
      buffer: allImages[0], // Первая страница как основное изображение
      publicUrl: allPageUrls[0], // URL первой страницы
      enhancedUrl: allEnhancedUrls[0], // URL улучшенной первой страницы
      allPages: allPageUrls,
      allEnhancedPages: allEnhancedUrls,
      success: true
    };
    
  } catch (error) {
    return createErrorResult(fileId, `Общая ошибка конвертации: ${(error as Error).message}`);
  }
}

/**
 * Создает результат с ошибкой и изображением ошибки
 */
async function createErrorResult(fileId: string, errorMessage: string): Promise<PDFDebugResult> {
  try {
    const errorImageName = `error-${fileId}.png`;
    const errorImagePath = path.join(process.cwd(), 'public', 'debug-images', errorImageName);
    const errorImageUrl = `/debug-images/${errorImageName}`;
    
    // Создаем изображение с текстом ошибки
    const width = 800;
    const height = 400;
    
    const errorImage = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
    
    // Сохраняем изображение ошибки
    writeFileSync(errorImagePath, errorImage);
    
    return {
      buffer: errorImage,
      publicUrl: errorImageUrl,
      errorMessage,
      success: false
    };
  } catch (err) {
    // Если не удалось создать изображение ошибки
    return {
      buffer: Buffer.from([]),
      publicUrl: '',
      errorMessage: `${errorMessage} (и ошибка при создании изображения ошибки: ${(err as Error).message})`,
      success: false
    };
  }
}