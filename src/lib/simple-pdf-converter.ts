/**
 * Простой модуль для работы с PDF, использующий исключительно библиотеку sharp
 * Не требует внешних инструментов или сложных зависимостей
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Преобразует PDF в изображение с помощью библиотеки sharp
 * @param pdfBuffer Буфер PDF файла
 * @returns Promise<Buffer> Буфер изображения PNG
 */
export async function simplePdfToImage(pdfBuffer: Buffer): Promise<Buffer | null> {
  try {
    // Создаем временную директорию для работы с файлами
    const tempDir = path.join(os.tmpdir(), `pdf-sharp-convert-${uuidv4()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
      // Сохраняем PDF во временный файл
      const pdfPath = path.join(tempDir, 'input.pdf');
      fs.writeFileSync(pdfPath, pdfBuffer);
      
      // Используем sharp для конвертации PDF в изображение
      // Sharp может напрямую обрабатывать первую страницу PDF
      const outputBuffer = await sharp(pdfBuffer, { 
        pages: 1, // Обрабатываем только первую страницу
        density: 300 // Высокая плотность для лучшего качества
      })
        .toFormat('png')
        .png({ quality: 100 })
        .toBuffer();
        
      console.log('PDF успешно конвертирован в изображение с помощью Sharp');
      return outputBuffer;
    } finally {
      // Очищаем временные файлы
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  } catch (error) {
    console.error('Ошибка при конвертации PDF в изображение с помощью Sharp:', error);
    return null;
  }
}