/**
 * Утилиты для улучшенной обработки PDF файлов
 * Эти функции помогают оптимизировать распознавание текста в PDF документах
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Преобразует PDF в оптимизированное изображение для OCR
 * Использует внешние инструменты (ImageMagick/Ghostscript/pdftoppm) если они доступны
 * @param buffer Буфер PDF файла
 * @returns Promise<Buffer> Буфер изображения или null в случае ошибки
 */
export async function convertPdfToImage(buffer: Buffer): Promise<Buffer | null> {
  try {
    // Проверяем валидность PDF (хотя бы базовая проверка размера и заголовка)
    if (buffer.length < 100 || !buffer.toString('ascii', 0, 5).includes('%PDF')) {
      console.error('Ошибка: Файл не похож на валидный PDF документ');
      throw new Error('Некорректный формат PDF документа');
    }

    // Создаем временную директорию для работы с файлами
    const tempDir = path.join(os.tmpdir(), `pdf-ocr-${uuidv4()}`);
    
    try {
      // Создаем временную директорию, если она не существует
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Создаем временный файл PDF
      const pdfPath = path.join(tempDir, 'input.pdf');
      fs.writeFileSync(pdfPath, buffer);
      
      // Выходной путь для изображения
      const imagePath = path.join(tempDir, 'output.png');
      
      // Метод 1: Пробуем использовать ImageMagick для преобразования
      try {
        console.log('Попытка конвертации с помощью ImageMagick...');
        // Используем высокое DPI для лучшего качества распознавания текста
        await execAsync(`magick convert -density 300 -quality 100 "${pdfPath}[0]" -background white -alpha remove "${imagePath}"`);
        
        // Проверяем, создался ли файл и имеет ли он подходящий размер
        if (fs.existsSync(imagePath)) {
          const stats = fs.statSync(imagePath);
          if (stats.size > 1000) { // Минимальный размер для валидного изображения
            console.log('Успешная конвертация с помощью ImageMagick');
            const imageBuffer = fs.readFileSync(imagePath);
            return imageBuffer;
          } else {
            console.log('ImageMagick создал файл, но он слишком маленький');
          }
        }
      } catch (magickError) {
        console.log('ImageMagick не доступен или произошла ошибка:', magickError);
      }
      
      // Метод 2: Пробуем использовать Ghostscript
      try {
        console.log('Попытка конвертации с помощью Ghostscript...');
        const gsImagePath = path.join(tempDir, 'gs_output.png');
        
        // Ghostscript команда для высокого качества
        await execAsync(`gswin64c -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r300 -dNOPAUSE -dBATCH -dSAFER -sOutputFile="${gsImagePath}" "${pdfPath}"`);
        
        if (fs.existsSync(gsImagePath)) {
          const stats = fs.statSync(gsImagePath);
          if (stats.size > 1000) {
            console.log('Успешная конвертация с помощью Ghostscript');
            const imageBuffer = fs.readFileSync(gsImagePath);
            return imageBuffer;
          } else {
            console.log('Ghostscript создал файл, но он слишком маленький');
          }
        }
      } catch (gsError) {
        console.log('Ghostscript не доступен или произошла ошибка:', gsError);
      }
      
      // Метод 3: Пробуем использовать pdftoppm из пакета Poppler
      try {
        console.log('Попытка конвертации с помощью pdftoppm...');
        const ppmImagePath = path.join(tempDir, 'ppm_output');
        
        // pdftoppm создает изображения высокого качества
        await execAsync(`pdftoppm -png -r 300 -singlefile "${pdfPath}" "${ppmImagePath}"`);
        
        const ppmOutputPath = `${ppmImagePath}.png`;
        if (fs.existsSync(ppmOutputPath)) {
          const stats = fs.statSync(ppmOutputPath);
          if (stats.size > 1000) {
            console.log('Успешная конвертация с помощью pdftoppm');
            const imageBuffer = fs.readFileSync(ppmOutputPath);
            return imageBuffer;
          } else {
            console.log('pdftoppm создал файл, но он слишком маленький');
          }
        }
      } catch (ppmError) {
        console.log('pdftoppm не доступен или произошла ошибка:', ppmError);
      }
      
      // Если все методы не сработали, выбрасываем ошибку
      throw new Error('Не удалось преобразовать PDF в изображение. Проверьте качество PDF документа или установите необходимые инструменты (ImageMagick, Ghostscript или Poppler).');
    } finally {
      // Очищаем временные файлы
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupError) {
        console.error('Ошибка при очистке временных файлов:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Ошибка при конвертации PDF в изображение:', error);
    throw error; // Прокидываем ошибку выше для лучшей диагностики
  }
}

/**
 * Проверяет, содержит ли PDF текстовый слой
 * Если текстовый слой есть, то распознавание может быть не нужно
 * @param buffer Буфер PDF файла
 * @returns Promise<boolean> true если PDF содержит текстовый слой
 */
export async function checkPdfHasTextLayer(buffer: Buffer): Promise<boolean> {
  try {
    // Создаем временную директорию для работы с файлами
    const tempDir = path.join(os.tmpdir(), `pdf-text-check-${uuidv4()}`);
    
    try {
      // Создаем временную директорию, если она не существует
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Создаем временный файл PDF
      const pdfPath = path.join(tempDir, 'check.pdf');
      fs.writeFileSync(pdfPath, buffer);
      
      // Пробуем извлечь текст с помощью pdftotext (если доступен)
      try {
        const { stdout } = await execAsync(`pdftotext "${pdfPath}" - | wc -w`);
        // Если количество слов больше 10, считаем что PDF имеет текстовый слой
        return parseInt(stdout.trim(), 10) > 10;
      } catch (pdftotextError) {
        console.log('pdftotext не доступен или произошла ошибка');
        return false;
      }
    } finally {
      // Очищаем временные файлы
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupError) {
        console.error('Ошибка при очистке временных файлов:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке текстового слоя PDF:', error);
    return false;
  }
}