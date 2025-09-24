/**
 * Модуль для конвертации PDF в изображения с сохранением результатов
 * для диагностики и отладки
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
// PDF.js для определения количества страниц
// PDF.js импортируем только при использовании

const execAsync = promisify(exec);

interface ConversionResult {
  buffer: Buffer;
  filePath: string;
  publicUrl: string;
  enhancedUrl?: string; // Опциональное поле для улучшенной версии
  allPages?: string[];  // Массив URL всех конвертированных страниц
  allEnhancedPages?: string[]; // Массив URL всех улучшенных страниц
}

/**
 * Конвертирует PDF в изображение и сохраняет результат в публичную директорию
 * @param pdfBuffer Буфер PDF файла
 * @returns Объект с буфером изображения и путем к сохраненному файлу
 */
export async function convertPdfWithDebug(pdfBuffer: Buffer): Promise<ConversionResult | null> {
    // Создаем уникальный идентификатор для файла
  const fileId = uuidv4();
  const fileName = `pdf-convert-${fileId}.png`;
  const enhancedFileName = `enhanced-${fileId}.png`;
  
  // Определяем пути для сохранения
  const publicDir = path.join(process.cwd(), 'public', 'debug-images');
  const enhancedDir = path.join(publicDir, 'enhanced');
  const outputPath = path.join(publicDir, fileName);
  const enhancedOutputPath = path.join(enhancedDir, enhancedFileName);
  const publicUrl = `/debug-images/${fileName}`;
  const enhancedPublicUrl = `/debug-images/enhanced/${enhancedFileName}`;  // Создаем директорию, если она не существует
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  try {
    // Определяем количество страниц в PDF
    let pageCount = 1;
    try {
      // Пытаемся определить количество страниц с помощью sharp
      const metadata = await sharp(pdfBuffer).metadata();
      if (metadata.pages && metadata.pages > 0) {
        pageCount = metadata.pages;
        console.log(`PDF содержит ${pageCount} страниц (определено с помощью sharp)`);
      }
    } catch (pdfError) {
      console.error('Не удалось определить количество страниц в PDF:', pdfError);
    }
    
    // Для нескольких страниц создаем массив буферов
    let imageBuffers: Buffer[] = [];
    
    if (pageCount > 1) {
      // Пытаемся конвертировать каждую страницу
      for (let page = 0; page < Math.min(pageCount, 3); page++) { // Ограничиваем 3 страницами
        try {
          const pageBuffer = await sharp(pdfBuffer, {
            pages: 1,
            page: page,
            density: 300
          })
          .greyscale()
          .normalize()
          .sharpen()
          .toFormat('png', { quality: 100, compressionLevel: 9 })
          .toBuffer();
          
          imageBuffers.push(pageBuffer);
        } catch (pageError) {
          console.error(`Ошибка при конвертации страницы ${page + 1}:`, pageError);
        }
      }
    }
    
    // Если не удалось сконвертировать страницы по-отдельности или это одностраничный PDF
    if (imageBuffers.length === 0) {
      // Пытаемся конвертировать первую страницу
      const imageBuffer = await sharp(pdfBuffer, {
        pages: 1,
        density: 300
      })
      .greyscale()
      .normalize()
      .sharpen()
      .toFormat('png', { quality: 100, compressionLevel: 9 })
      .toBuffer();
      
      imageBuffers = [imageBuffer];
    }
    
    // Используем первую страницу как основное изображение
    const imageBuffer = imageBuffers[0];
    
    // Сохраняем все страницы (или первую, если только одна)
    const savedPages = [];
    
    // Сохраняем первую страницу как основное изображение
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`PDF сконвертирован и сохранен в ${outputPath}`);
    savedPages.push(publicUrl);
    
    // Сохраняем дополнительные страницы, если они есть
    if (imageBuffers.length > 1) {
      for (let i = 1; i < imageBuffers.length; i++) {
        const pageFileName = `pdf-convert-${fileId}-page${i+1}.png`;
        const pageOutputPath = path.join(publicDir, pageFileName);
        const pagePublicUrl = `/debug-images/${pageFileName}`;
        
        fs.writeFileSync(pageOutputPath, imageBuffers[i]);
        savedPages.push(pagePublicUrl);
      }
    }
    
    // Создаем улучшенную версию изображения для OCR
    try {
      // Создаем директорию для улучшенных изображений, если она не существует
      if (!fs.existsSync(enhancedDir)) {
        fs.mkdirSync(enhancedDir, { recursive: true });
      }
      
      // Создаем улучшенные версии всех страниц
      const enhancedPages = [];
      
      for (let i = 0; i < imageBuffers.length; i++) {
        const pageSuffix = i === 0 ? '' : `-page${i+1}`;
        const enhancedFileName = `enhanced-${fileId}${pageSuffix}.png`;
        const enhancedPath = path.join(enhancedDir, enhancedFileName);
        const enhancedUrl = `/debug-images/enhanced/${enhancedFileName}`;
        
        // Создаем черно-белую версию с улучшенным контрастом
        const enhancedImageBuffer = await sharp(imageBuffers[i])
          .greyscale()
          .normalize()
          .threshold(128) // Бинаризация изображения (черно-белый)
          .gamma(1.5)     // Увеличиваем гамму для улучшения контраста
          .sharpen(2)     // Увеличиваем резкость
          .toBuffer();
        
        // Сохраняем улучшенное изображение
        fs.writeFileSync(enhancedPath, enhancedImageBuffer);
        enhancedPages.push(enhancedUrl);
      }
      
      console.log(`Сохранено ${enhancedPages.length} улучшенных изображений`);
      
      return {
        buffer: imageBuffer,
        filePath: outputPath,
        publicUrl: publicUrl,
        enhancedUrl: enhancedPages[0], // Первая страница как основная улучшенная версия
        allPages: savedPages, // Все оригинальные страницы
        allEnhancedPages: enhancedPages // Все улучшенные страницы
      };
    } catch (enhanceError) {
      console.error('Ошибка при создании улучшенной версии:', enhanceError);
      // Продолжаем с оригинальным изображением, если улучшенную версию создать не удалось
      return {
        buffer: imageBuffer,
        filePath: outputPath,
        publicUrl: publicUrl
      };
    }
  } catch (sharpError) {
    console.error('Ошибка при конвертации PDF с помощью Sharp:', sharpError);
    
    // Пробуем с помощью ImageMagick, если он доступен
    try {
      // Создаем временный файл PDF
      const tempPdfPath = path.join(publicDir, `temp-${fileId}.pdf`);
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      
      // Выполняем конвертацию с помощью ImageMagick с улучшенными параметрами для OCR
      try {
        // Используем более агрессивную настройку для OCR: более высокую плотность, 
        // шумоподавление, улучшение контраста и бинаризацию для улучшения распознавания текста
        await execAsync(`magick convert -density 400 -colorspace gray -normalize -contrast-stretch 0 -level 50%,90% -sharpen 0x1 -quality 100 "${tempPdfPath}" "${outputPath}"`);
        console.log('ImageMagick успешно сконвертировал PDF с улучшенными параметрами для OCR');
        
        if (fs.existsSync(outputPath)) {
          const imageBuffer = fs.readFileSync(outputPath);
          
          // Удаляем временный PDF-файл
          if (fs.existsSync(tempPdfPath)) {
            fs.unlinkSync(tempPdfPath);
          }
          
          return {
            buffer: imageBuffer,
            filePath: outputPath,
            publicUrl: publicUrl
          };
        }
      } catch (magickError) {
        console.error('Ошибка при конвертации с помощью ImageMagick:', magickError);
      }
      
      // Удаляем временный PDF-файл, если он все еще существует
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
      
      // Пробуем Ghostscript
      try {
        const gsOutputPath = path.join(publicDir, `gs-${fileName}`);
        // Используем улучшенные параметры для Ghostscript: 
        // - Увеличенное разрешение (400 dpi вместо 300)
        // - Повышенное сглаживание текста (TextAlphaBits=4)
        // - Улучшенное сглаживание графики (GraphicsAlphaBits=4)
        // - Добавлена опция -dDownScaleFactor=1 для предотвращения снижения качества
        await execAsync(`gswin64c -sDEVICE=pnggray -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r400 -dDownScaleFactor=1 -dNOPAUSE -dBATCH -dSAFER -sOutputFile="${gsOutputPath}" "${tempPdfPath}"`);
        
        if (fs.existsSync(gsOutputPath)) {
          // Копируем результат в основной путь
          fs.copyFileSync(gsOutputPath, outputPath);
          const imageBuffer = fs.readFileSync(outputPath);
          
          // Удаляем временный файл Ghostscript
          fs.unlinkSync(gsOutputPath);
          
          return {
            buffer: imageBuffer,
            filePath: outputPath,
            publicUrl: publicUrl
          };
        }
      } catch (gsError) {
        console.error('Ошибка при конвертации с помощью Ghostscript:', gsError);
      }
    } catch (error) {
      console.error('Глобальная ошибка при конвертации PDF:', error);
    }
  }
  
  // Создаем тестовое изображение, чтобы показать, что процесс конвертации не удался
  try {
    // Создаем простое изображение с текстом "Ошибка конвертации PDF"
    // Создаем пустое изображение с белым фоном
    const errorImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    // Добавляем текст как простые метаданные, так как sharp не поддерживает рисование текста напрямую
    .withMetadata({
      exif: {
        IFD0: {
          ImageDescription: `Ошибка конвертации PDF - ID: ${fileId}`
        }
      }
    })
    .png()
    .toBuffer();
    
    // Сохраняем ошибочное изображение
    fs.writeFileSync(outputPath, errorImageBuffer);
    
    return {
      buffer: errorImageBuffer,
      filePath: outputPath,
      publicUrl: publicUrl
    };
  } catch (errorImageError) {
    console.error('Не удалось создать даже изображение с ошибкой:', errorImageError);
    return null;
  }
}