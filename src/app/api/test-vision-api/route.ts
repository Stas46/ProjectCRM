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
    
    try {
      // Инициализируем клиент Google Cloud Vision API
      const client = new ImageAnnotatorClient();
      
      // Выполняем несколько типов анализа для демонстрации возможностей
      const [textDetection] = await client.textDetection(filePath);
      const [documentTextDetection] = await client.documentTextDetection(filePath);
      const [imageProperties] = await client.imageProperties(filePath);
      const [labelDetection] = await client.labelDetection(filePath);
      
      // Опционально можно добавить обнаружение логотипов
      const [logoDetection] = await client.logoDetection(filePath);
      
      // Удаляем временный файл
      fs.unlinkSync(filePath);
      
      // Формируем результат
      return NextResponse.json({
        success: true,
        fileName: file.name,
        fileType: fileType,
        fileSize: file.size,
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
      // Если временный файл все еще существует, удаляем его
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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