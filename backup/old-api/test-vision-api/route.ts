import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * API-маршрут для тестирования Google Cloud Vision API
 * Этот маршрут позволяет загрузить изображение или PDF-файл и получить результаты распознавания
 */
export async function POST(request: NextRequest) {
  try {
    // Проверяем, является ли запрос multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Запрос должен быть в формате multipart/form-data' },
        { status: 400 }
      );
    }

    // Получаем FormData из запроса
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
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

    // Сохраняем файл временно
    const tempDir = os.tmpdir();
    const fileName = `${uuidv4()}-${file.name}`;
    const filePath = path.join(tempDir, fileName);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    
    let finalImagePath = filePath;
    let conversionInfo = null;

    // Если это PDF - конвертируем в изображение
    if (fileType === 'application/pdf') {
      console.log('� Обнаружен PDF файл - начинаем конвертацию...');
      
      try {
        console.log('🔄 Конвертируем PDF в PNG с помощью pdf.js...');
        
        // Читаем PDF файл
        const pdfData = new Uint8Array(fs.readFileSync(filePath));
        
        // Загружаем PDF документ
        const pdfDocument = await pdfjsLib.getDocument({
          data: pdfData,
          useSystemFonts: true
        }).promise;
        
        // Получаем первую страницу
        const page = await pdfDocument.getPage(1);
        
        // Настраиваем масштаб для высокого качества
        const scale = 2.0;
        const viewport = page.getViewport({ scale });
        
        // Создаем canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        // Рендерим страницу
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Сохраняем как PNG
        const convertedFileName = `converted-${uuidv4()}.png`;
        const convertedPath = path.join(tempDir, convertedFileName);
        
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(convertedPath, buffer);
        
        finalImagePath = convertedPath;
        conversionInfo = {
          originalFormat: 'PDF',
          convertedTo: 'PNG',
          convertedPath: convertedPath,
          pagesConverted: 1,
          dimensions: `${viewport.width}x${viewport.height}`,
          scale: scale
        };
        
        console.log('✅ PDF успешно конвертирован с помощью pdf.js:', convertedPath);
      } catch (pdfError: any) {
        console.error('❌ Ошибка конвертации PDF:', pdfError);
        // Продолжаем с оригинальным файлом
        console.log('⚠️ Попробуем обработать PDF напрямую...');
      }
    }
    
    try {
      console.log('�🔍 Отправляем файл в Google Vision API...');
      console.log('📄 Тип файла:', fileType);
      console.log('📏 Размер файла:', file.size, 'байт');
      console.log('📁 Путь к файлу:', finalImagePath);
      console.log('🔄 Конвертация:', conversionInfo ? 'Выполнена' : 'Не требуется');
      
      // Инициализируем клиент Google Cloud Vision API
      const client = new ImageAnnotatorClient();
      
      // Выполняем несколько типов анализа для демонстрации возможностей
      console.log('🔤 Выполняем text detection...');
      const [textDetection] = await client.textDetection(finalImagePath);
      console.log('📄 Выполняем document text detection...');
      const [documentTextDetection] = await client.documentTextDetection(finalImagePath);
      console.log('🎨 Выполняем image properties...');
      const [imageProperties] = await client.imageProperties(finalImagePath);
      console.log('🏷️ Выполняем label detection...');
      const [labelDetection] = await client.labelDetection(finalImagePath);
      console.log('🔍 Выполняем logo detection...');
      const [logoDetection] = await client.logoDetection(finalImagePath);
      
      console.log('✅ Все API вызовы выполнены успешно');
      console.log('📝 Найден текст (textDetection):', textDetection.fullTextAnnotation?.text ? 'ДА' : 'НЕТ');
      console.log('📄 Найден текст (documentTextDetection):', documentTextDetection.fullTextAnnotation?.text ? 'ДА' : 'НЕТ');
      
      // Удаляем временные файлы
      fs.unlinkSync(filePath);
      if (conversionInfo && finalImagePath !== filePath && fs.existsSync(finalImagePath)) {
        fs.unlinkSync(finalImagePath);
      }
      
      // Формируем результат
      return NextResponse.json({
        success: true,
        fileName: file.name,
        fileType: fileType,
        fileSize: file.size,
        conversionInfo: conversionInfo,
        results: {
          // Обнаружение текста (лучше для коротких текстов, вывесок и т.д.)
          textDetection: {
            fullText: textDetection.fullTextAnnotation?.text || '',
            textAnnotations: textDetection.textAnnotations?.map(annotation => ({
              text: annotation.description,
              boundingPoly: annotation.boundingPoly,
              confidence: annotation.confidence
            })) || []
          },
          
          // Обнаружение текста документа (лучше для структурированных документов, счетов и т.д.)
          documentTextDetection: {
            fullText: documentTextDetection.fullTextAnnotation?.text || '',
            pages: documentTextDetection.fullTextAnnotation?.pages?.map(page => ({
              width: page.width,
              height: page.height,
              blocks: page.blocks?.length || 0,
              paragraphs: page.blocks?.reduce((count, block) => 
                count + (block.paragraphs?.length || 0), 0) || 0
            }))
          },
          
          // Свойства изображения (цвета и т.д.)
          imageProperties: {
            dominantColors: imageProperties.imagePropertiesAnnotation?.dominantColors?.colors?.map(color => ({
              color: {
                red: color.color?.red,
                green: color.color?.green,
                blue: color.color?.blue
              },
              score: color.score,
              pixelFraction: color.pixelFraction
            })) || []
          },
          
          // Обнаружение меток/объектов
          labelDetection: {
            labels: labelDetection.labelAnnotations?.map(label => ({
              description: label.description,
              score: label.score
            })) || []
          },
          
          // Обнаружение логотипов
          logoDetection: {
            logos: logoDetection.logoAnnotations?.map(logo => ({
              description: logo.description,
              score: logo.score,
              boundingPoly: logo.boundingPoly
            })) || []
          }
        }
      });
      
    } catch (error: any) {
      // Если временные файлы все еще существуют, удаляем их
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (conversionInfo && finalImagePath !== filePath && fs.existsSync(finalImagePath)) {
        fs.unlinkSync(finalImagePath);
      }
      
      console.error('Ошибка при обработке файла в Google Cloud Vision API:', error);
      
      return NextResponse.json(
        { 
          error: 'Ошибка при обработке файла', 
          details: error.message || 'Неизвестная ошибка',
          suggestions: [
            'Проверьте настройки аутентификации Google Cloud',
            'Убедитесь, что Google Cloud Vision API включен для вашего проекта',
            'Попробуйте изображение лучшего качества'
          ]
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Глобальная ошибка в API тестирования Vision:', error);
    
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера', 
        details: error.message || 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}