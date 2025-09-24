/**
 * Модуль для конвертации PDF в изображения с использованием PDF.js
 * Не требует внешних инструментов, работает полностью в Node.js
 */

import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// Настраиваем PDF.js для работы в Node.js
// В Node.js мы должны использовать nodejs-specific worker
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.js');
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Преобразует PDF в изображение используя PDF.js
 * @param pdfBuffer Буфер PDF файла
 * @returns Promise<Buffer> Буфер изображения PNG
 */
export async function convertPdfToImageWithPdfJs(pdfBuffer: Buffer): Promise<Buffer | null> {
  try {
    // Создаем временный файл для сохранения результата
    const tempDir = path.join(os.tmpdir(), `pdf-js-convert-${uuidv4()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    const outputPath = path.join(tempDir, 'output.png');

    try {
      // Загружаем PDF из буфера
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
        verbosity: 0,
      });
      
      const pdfDocument = await loadingTask.promise;
      console.log(`PDF документ загружен, страниц: ${pdfDocument.numPages}`);
      
      // Загружаем первую страницу (можно изменить, если нужны другие страницы)
      const page = await pdfDocument.getPage(1);
      
      // Определяем размер страницы и масштаб для хорошего качества распознавания
      const viewport = page.getViewport({ scale: 2.0 }); // Масштаб 2.0 для лучшего качества
      
      // Создаем canvas для рендеринга страницы
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      // Настраиваем canvas для рендеринга
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvasFactory: {
          create: function(width: number, height: number) {
            return {
              canvas: createCanvas(width, height),
              context: context
            };
          },
          reset: function(canvasAndContext: any, width: number, height: number) {
            canvasAndContext.canvas.width = width;
            canvasAndContext.canvas.height = height;
          },
          destroy: function(canvasAndContext: any) {
            // Ничего не делаем, canvas в Node.js не нужно очищать
          }
        }
      };
      
      // Рендерим страницу в canvas
      await page.render(renderContext).promise;
      
      // Конвертируем canvas в PNG буфер
      const pngBuffer = canvas.toBuffer('image/png');
      
      // Оптимизируем изображение для OCR с помощью sharp
      const optimizedBuffer = await sharp(pngBuffer)
        // Увеличиваем яркость
        .modulate({ brightness: 1.05 })
        // Нормализуем для улучшения контраста
        .normalise()
        // Преобразуем в grayscale для улучшения распознавания текста
        .grayscale()
        // Увеличиваем резкость
        .sharpen({ sigma: 1 })
        .png({ quality: 90 })
        .toBuffer();
      
      // Сохраняем результат во временный файл
      fs.writeFileSync(outputPath, optimizedBuffer);
      
      console.log('PDF успешно преобразован в изображение с помощью PDF.js');
      return optimizedBuffer;
    } finally {
      // Очищаем временные файлы
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  } catch (error) {
    console.error('Ошибка при конвертации PDF в изображение с помощью PDF.js:', error);
    return null;
  }
}

/**
 * Создает читаемый поток из буфера
 * @param buffer Буфер данных
 * @returns Readable Читаемый поток
 */
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}