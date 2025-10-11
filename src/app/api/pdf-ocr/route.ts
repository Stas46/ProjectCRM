import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient() {
  if (!visionClient) {
    try {
      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      
      if (credentials) {
        const credentialsObj = JSON.parse(credentials);
        visionClient = new ImageAnnotatorClient({
          credentials: credentialsObj,
          projectId: credentialsObj.project_id
        });
      } else {
        visionClient = new ImageAnnotatorClient();
      }
      
      console.log('✅ Google Vision API инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации Google Vision:', error);
      throw new Error('Google Vision API не настроен');
    }
  }
  
  return visionClient;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [PDF-OCR] Запрос на распознавание PDF');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 [PDF-OCR] Файл: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
    
    // Проверка типа файла - поддерживаем PDF и изображения
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Неподдерживаемый тип файла',
        suggestions: [
          'Используйте PDF файлы или изображения в формате JPEG, PNG, WEBP, HEIC',
          'Убедитесь, что файл не поврежден'
        ]
      }, { status: 400 });
    }
    
    // Конвертируем файл в буфер
    console.log('🔄 [PDF-OCR] Конвертация в буфер...');
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`💾 [PDF-OCR] Буфер создан: ${fileBuffer.length} байт`);
    
    // Получаем клиента Google Vision
    console.log('🤖 [PDF-OCR] Инициализация Google Vision...');
    const client = getVisionClient();
    
    console.log('📝 [PDF-OCR] Отправка на распознавание...');
    const startTime = Date.now();
    
    // Используем documentTextDetection для PDF файлов, textDetection для изображений
    let result;
    if (file.type === 'application/pdf') {
      console.log('📋 [PDF-OCR] Распознавание PDF документа...');
      [result] = await client.documentTextDetection({
        image: { content: fileBuffer }
      });
    } else {
      console.log('🖼️ [PDF-OCR] Распознавание изображения...');
      [result] = await client.textDetection({
        image: { content: fileBuffer }
      });
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️ [PDF-OCR] Время обработки: ${processingTime}мс`);
    
    if (!result) {
      throw new Error('Пустой ответ от Google Vision API');
    }
    
    // Извлекаем текст
    let extractedText = '';
    let confidence = 0;
    let wordCount = 0;
    
    if (file.type === 'application/pdf') {
      // Для PDF используем fullTextAnnotation
      const fullTextAnnotation = result.fullTextAnnotation;
      if (fullTextAnnotation?.text) {
        extractedText = fullTextAnnotation.text;
        confidence = fullTextAnnotation.pages?.[0]?.confidence || 0;
      }
    } else {
      // Для изображений используем textAnnotations
      const textAnnotations = result.textAnnotations;
      if (textAnnotations && textAnnotations.length > 0) {
        extractedText = textAnnotations[0].description || '';
        confidence = textAnnotations[0].confidence || 0;
      }
    }
    
    wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
    
    console.log(`📊 [PDF-OCR] Результат: ${extractedText.length} символов, ${wordCount} слов, уверенность: ${Math.round(confidence * 100)}%`);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Текст не обнаружен',
        suggestions: [
          'Убедитесь, что файл содержит читаемый текст',
          'Проверьте качество изображения или PDF',
          'Попробуйте файл с более четким текстом'
        ],
        metadata: {
          fileSize: Math.round(file.size / 1024),
          processingTime,
          fileType: file.type
        }
      }, { status: 400 });
    }
    
    // Анализируем содержимое для определения типа документа
    const lowerText = extractedText.toLowerCase();
    let documentType = 'unknown';
    let documentInfo = {};
    
    if (lowerText.includes('счет') || lowerText.includes('invoice') || 
        lowerText.includes('итого') || lowerText.includes('сумма')) {
      documentType = 'invoice';
    } else if (lowerText.includes('договор') || lowerText.includes('contract')) {
      documentType = 'contract';
    } else if (lowerText.includes('акт') || lowerText.includes('приемки')) {
      documentType = 'act';
    }
    
    console.log(`🏷️ [PDF-OCR] Тип документа: ${documentType}`);
    
    // Попытка извлечь структурированную информацию
    if (documentType === 'invoice') {
      const amountMatch = extractedText.match(/(\d+[\s,.]?\d*)\s*руб/i);
      const dateMatch = extractedText.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
      
      documentInfo = {
        amount: amountMatch ? amountMatch[1] : null,
        date: dateMatch ? dateMatch[1] : null
      };
    }
    
    return NextResponse.json({
      success: true,
      text: extractedText,
      metadata: {
        fileName: file.name,
        fileSize: Math.round(file.size / 1024),
        fileType: file.type,
        charactersCount: extractedText.length,
        wordsCount: wordCount,
        confidence: Math.round(confidence * 100),
        processingTime,
        documentType,
        documentInfo
      }
    });
    
  } catch (error: any) {
    console.error('❌ [PDF-OCR] Ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Произошла ошибка при распознавании',
      suggestions: [
        'Проверьте настройки Google Vision API',
        'Убедитесь, что файл не поврежден',
        'Попробуйте еще раз через несколько секунд'
      ]
    }, { status: 500 });
  }
}