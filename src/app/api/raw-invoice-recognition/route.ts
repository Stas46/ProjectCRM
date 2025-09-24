import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { convertPdfToImage } from '@/lib/pdf-processing';
import { simplePdfToImage } from '@/lib/simple-pdf-converter';
import { convertPdfWithDebug } from '@/lib/pdf-debug-converter';
import { convertPdfWithBetterDebug } from '@/lib/better-pdf-converter';

/**
 * Упрощенный API-маршрут для тестирования распознавания счетов
 * Возвращает сырой ответ Google Vision API без дополнительной обработки
 */
export async function POST(request: NextRequest) {
  console.log('Получен запрос на распознавание счета');
  
  try {
    // Проверяем формат запроса
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Запрос должен быть в формате multipart/form-data' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Получаем файл из формы
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const recognitionType = formData.get('recognitionType') as string || 'documentTextDetection';
    const language = formData.get('language') as string || 'en';
    
    console.log(`Тип распознавания: ${recognitionType}, Язык: ${language}`);
    
    if (!file) {
      return NextResponse.json(
        { error: 'Файл не был отправлен' },
        { status: 400 }
      );
    }

    // Проверяем тип файла
    const fileType = file.type;
    if (!fileType.startsWith('image/') && fileType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Поддерживаются только изображения и PDF-файлы' },
        { status: 400 }
      );
    }

    console.log(`Получен файл: ${file.name}, тип: ${fileType}, размер: ${file.size} байт`);

    // Сохраняем файл во временную директорию
    const tempDir = os.tmpdir();
    const fileId = uuidv4();
    const fileName = `${fileId}-${file.name}`;
    const filePath = path.join(tempDir, fileName);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    
    // Переменные для хранения буфера изображения и примечаний
    let imageBuffer: Buffer = buffer;
    let processingNotes: string[] = [];
    
    // Если это PDF, сохраним его также в публичную директорию для анализа
    if (fileType === 'application/pdf') {
      try {
        const publicDir = path.join(process.cwd(), 'public', 'debug-images');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        const publicPdfPath = path.join(publicDir, `original-${fileId}.pdf`);
        fs.writeFileSync(publicPdfPath, buffer);
        const publicPdfUrl = `/debug-images/original-${fileId}.pdf`;
        processingNotes.push(`Оригинальный PDF: <a href="${publicPdfUrl}" target="_blank" class="text-blue-600 hover:underline">Скачать PDF</a>`);
      } catch (saveError) {
        console.error('Не удалось сохранить оригинальный PDF:', saveError);
      }
    }
    
    console.log(`Файл сохранен во временную директорию: ${filePath}`);

    // Если это PDF, конвертируем его в изображение
    if (fileType === 'application/pdf') {
      try {
        console.log('Конвертация PDF в изображение с использованием улучшенного конвертера...');
        
        // Используем улучшенный отладочный конвертер, который более надежен
        const betterDebugResult = await convertPdfWithBetterDebug(buffer, file.name);
        
        if (betterDebugResult.success) {
          console.log('PDF успешно конвертирован в изображение');
          imageBuffer = betterDebugResult.buffer;
          
          processingNotes.push('PDF успешно конвертирован в изображение');
          processingNotes.push(`Оригинальное изображение: ${betterDebugResult.publicUrl}`);
          
          // Если есть улучшенная версия
          if (betterDebugResult.enhancedUrl) {
            processingNotes.push(`Улучшенная версия для OCR: ${betterDebugResult.enhancedUrl}`);
            
            // Используем улучшенное изображение для распознавания
            try {
              const enhancedPath = path.join(process.cwd(), 'public', betterDebugResult.enhancedUrl.replace(/^\//, ''));
              if (fs.existsSync(enhancedPath)) {
                imageBuffer = fs.readFileSync(enhancedPath);
                processingNotes.push('Для распознавания используется улучшенная версия изображения');
              }
            } catch (enhancedError) {
              console.error('Не удалось загрузить улучшенное изображение:', enhancedError);
            }
          }
          
          // Если это многостраничный PDF
          if (betterDebugResult.allPages && betterDebugResult.allPages.length > 1) {
            processingNotes.push(`PDF содержит ${betterDebugResult.allPages.length} страниц`);
            
            // Добавляем ссылки на все страницы
            for (let i = 0; i < betterDebugResult.allPages.length; i++) {
              if (i === 0) continue; // Пропускаем первую страницу, она уже добавлена
              processingNotes.push(`Страница ${i+1}: ${betterDebugResult.allPages[i]}`);
            }
            
            // Добавляем ссылки на улучшенные версии
            if (betterDebugResult.allEnhancedPages && betterDebugResult.allEnhancedPages.length > 1) {
              for (let i = 0; i < betterDebugResult.allEnhancedPages.length; i++) {
                if (i === 0) continue; // Пропускаем первую страницу
                processingNotes.push(`Улучшенная страница ${i+1}: ${betterDebugResult.allEnhancedPages[i]}`);
              }
            }
          }
        } else {
          // В случае ошибки
          processingNotes.push(`Ошибка при конвертации PDF: ${betterDebugResult.errorMessage}`);
          if (betterDebugResult.publicUrl) {
            processingNotes.push(`Изображение ошибки: ${betterDebugResult.publicUrl}`);
          }
          
          // Пробуем использовать другие методы конвертации
          try {
            console.log('Пробуем запасные методы конвертации PDF...');
            
            // Пробуем классический метод с debug
            const classicDebugResult = await convertPdfWithDebug(buffer);
            if (classicDebugResult) {
              imageBuffer = classicDebugResult.buffer;
              processingNotes.push(`Резервный метод конвертации: ${classicDebugResult.publicUrl}`);
            } else {
              // Пробуем с помощью внешних инструментов
              const pdfImageBuffer = await convertPdfToImage(buffer);
              if (pdfImageBuffer) {
                console.log('PDF успешно конвертирован в изображение с помощью внешних инструментов');
                imageBuffer = pdfImageBuffer;
                processingNotes.push('PDF был конвертирован в изображение с помощью внешних инструментов');
              } else {
                // Если внешние инструменты не сработали, пробуем Sharp
                const sharpBuffer = await simplePdfToImage(buffer);
                if (sharpBuffer) {
                  console.log('PDF успешно конвертирован в изображение с помощью Sharp');
                  imageBuffer = sharpBuffer;
                  processingNotes.push('PDF был конвертирован в изображение с помощью Sharp');
                } else {
                  console.error('Не удалось конвертировать PDF в изображение ни одним методом');
                  processingNotes.push('Не удалось конвертировать PDF в изображение. Попробуйте загрузить файл в формате изображения.');
                }
              }
            }
          } catch (fallbackError: any) {
            console.error('Ошибка при использовании резервных методов конвертации PDF:', fallbackError);
            processingNotes.push(`Ошибка при использовании резервных методов: ${fallbackError.message}`);
          }
        }
      } catch (pdfError: any) {
        console.error('Глобальная ошибка при обработке PDF:', pdfError);
        processingNotes.push(`Ошибка при обработке PDF: ${pdfError.message}`);
      }
    }
    
    try {
      // Инициализируем клиент Google Cloud Vision API
      const client = new ImageAnnotatorClient();
      console.log('Клиент Google Cloud Vision API инициализирован');
      
      let result;
      
      // Настраиваем параметры запроса в зависимости от выбранного типа распознавания
      const imageContext = {
        languageHints: [language]
      };
      
      console.log('Отправляем запрос в Google Cloud Vision API:', { recognitionType, languageHints: imageContext.languageHints });
      
      // Создаем запрос с использованием буфера изображения (оригинального или конвертированного из PDF)
      const request = {
        image: {
          content: imageBuffer
        },
        imageContext: imageContext
      };
      
      // Выполняем запрос в зависимости от выбранного типа распознавания
      switch (recognitionType) {
        case 'textDetection':
          result = await client.textDetection(request);
          break;
        case 'documentTextDetection':
        default:
          result = await client.documentTextDetection(request);
          break;
      }
      
      console.log('Получен ответ от Google Cloud Vision API');
      
      // Удаляем временный файл
      fs.unlinkSync(filePath);
      console.log('Временный файл удален');
      
      // Формируем результат
      return NextResponse.json({
        success: true,
        fileName: file.name,
        fileType: fileType,
        fileSize: file.size,
        recognitionType: recognitionType,
        language: language,
        processingNotes: processingNotes,
        rawResponse: result[0],
        // Для удобства добавляем отдельно полный текст
        fullText: result[0].fullTextAnnotation?.text || ''
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error: any) {
      // Если временный файл все еще существует, удаляем его
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Временный файл удален после ошибки');
      }
      
      console.error('Ошибка при обработке файла в Google Cloud Vision API:', error);
      
      return NextResponse.json(
        { 
          error: 'Ошибка при обработке файла', 
          details: error.message || 'Неизвестная ошибка',
          stack: error.stack
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  } catch (error: any) {
    console.error('Глобальная ошибка в API распознавания:', error);
    
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера', 
        details: error.message || 'Неизвестная ошибка',
        stack: error.stack
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}