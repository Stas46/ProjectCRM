/**
 * Модуль для конвертации PDF в изображения с помощью Poppler
 * Использует утилиты pdftoppm или pdfimages
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const execFileAsync = promisify(execFile);

interface PopperResult {
  buffer: Buffer;
  success: boolean;
  publicUrl?: string;
  errorMessage?: string;
}

/**
 * Конвертирует PDF в изображение с использованием Poppler Utils (pdftoppm)
 * Требуется установка poppler-utils: https://poppler.freedesktop.org/
 */
export async function convertPdfWithPoppler(pdfBuffer: Buffer, fileName: string = 'unknown'): Promise<PopperResult> {
  // Создаем временную директорию для работы
  const tempDir = path.join(os.tmpdir(), `pdf-poppler-${uuidv4()}`);
  
  try {
    // Создаем временную директорию
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    // Сохраняем PDF во временную директорию
    const pdfPath = path.join(tempDir, 'input.pdf');
    const outputPrefix = path.join(tempDir, 'output');
    await fs.writeFile(pdfPath, pdfBuffer);
    
    // Проверяем, установлен ли pdftoppm
    try {
      // Используем pdftoppm для конвертации PDF в PNG
      await execFileAsync('pdftoppm', [
        '-png',        // Вывод в формате PNG
        '-r', '300',   // Разрешение 300 DPI
        '-singlefile', // Одно изображение для всего PDF
        pdfPath,       // Входной файл
        outputPrefix   // Префикс для выходного файла
      ]);
      
      // Проверяем результат
      const outputPath = `${outputPrefix}.png`;
      if (existsSync(outputPath)) {
        // Читаем конвертированное изображение
        const imageBuffer = await fs.readFile(outputPath);
        
        // Сохраняем копию в публичную директорию для отладки
        const publicDir = path.join(process.cwd(), 'public', 'debug-images');
        if (!existsSync(publicDir)) {
          mkdirSync(publicDir, { recursive: true });
        }
        
        const sanitizedName = fileName.replace(/[^a-z0-9]/gi, '-');
        const publicFileName = `poppler-${sanitizedName}-${uuidv4()}.png`;
        const publicPath = path.join(publicDir, publicFileName);
        const publicUrl = `/debug-images/${publicFileName}`;
        
        await fs.writeFile(publicPath, imageBuffer);
        
        return {
          buffer: imageBuffer,
          success: true,
          publicUrl
        };
      }
    } catch (pdftoppmError) {
      console.error('Ошибка при использовании pdftoppm:', pdftoppmError);
      
      // Пробуем альтернативный метод с pdfimages
      try {
        const imagesDir = path.join(tempDir, 'images');
        if (!existsSync(imagesDir)) {
          mkdirSync(imagesDir);
        }
        
        // Извлекаем изображения из PDF
        await execFileAsync('pdfimages', [
          '-png',       // Вывод в формате PNG
          '-f', '1',    // Первая страница
          '-l', '1',    // Последняя страница
          pdfPath,      // Входной файл
          path.join(imagesDir, 'img') // Префикс для выходных файлов
        ]);
        
        // Ищем первое изображение
        const files = await fs.readdir(imagesDir);
        const pngFiles = files.filter(file => file.endsWith('.png'));
        
        if (pngFiles.length > 0) {
          const firstImage = path.join(imagesDir, pngFiles[0]);
          const imageBuffer = await fs.readFile(firstImage);
          
          // Сохраняем копию в публичную директорию для отладки
          const publicDir = path.join(process.cwd(), 'public', 'debug-images');
          if (!existsSync(publicDir)) {
            mkdirSync(publicDir, { recursive: true });
          }
          
          const sanitizedName = fileName.replace(/[^a-z0-9]/gi, '-');
          const publicFileName = `pdfimages-${sanitizedName}-${uuidv4()}.png`;
          const publicPath = path.join(publicDir, publicFileName);
          const publicUrl = `/debug-images/${publicFileName}`;
          
          await fs.writeFile(publicPath, imageBuffer);
          
          return {
            buffer: imageBuffer,
            success: true,
            publicUrl
          };
        }
      } catch (pdfimagesError) {
        console.error('Ошибка при использовании pdfimages:', pdfimagesError);
      }
    }
    
    return {
      buffer: Buffer.from([]),
      success: false,
      errorMessage: 'Не удалось конвертировать PDF в изображение с помощью Poppler'
    };
  } catch (error) {
    console.error('Общая ошибка при конвертации PDF с Poppler:', error);
    return {
      buffer: Buffer.from([]),
      success: false,
      errorMessage: `Ошибка при конвертации PDF: ${(error as Error).message}`
    };
  } finally {
    // Очистка временной директории
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Ошибка при очистке временной директории:', cleanupError);
    }
  }
}