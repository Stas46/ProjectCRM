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
    console.log('🔍 Запрос на распознавание документа (изображение или PDF)');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 Файл: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
    
    // Проверка типа файла - теперь поддерживаем и PDF
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Неподдерживаемый тип файла',
        suggestions: [
          'Используйте изображения в формате JPEG, PNG, WEBP, HEIC или PDF файлы',
          'Убедитесь, что файл не поврежден'
        ]
      }, { status: 400 });
    }
    
    // Проверка размера
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'Файл слишком большой (максимум 10MB)',
        suggestions: [
          'Сожмите изображение',
          'Уменьшите разрешение'
        ]
      }, { status: 400 });
    }
    
    // Конвертируем в буфер
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`🖼️ Буфер готов: ${imageBuffer.length} байт`);
    
    // Инициализируем Google Vision
    const client = getVisionClient();
    
    // Запускаем распознавание текста - разные методы для PDF и изображений
    console.log('🔍 Запуск Google Vision API...');
    let result;
    
    if (file.type === 'application/pdf') {
      console.log('📄 Распознавание PDF документа...');
      // Для PDF используем documentTextDetection
      [result] = await client.documentTextDetection({
        image: { content: imageBuffer }
      });
    } else {
      console.log('🖼️ Распознавание изображения...');
      // Для изображений используем textDetection
      [result] = await client.textDetection({
        image: { content: imageBuffer }
      });
    }
    
    let rawText = '';
    
    if (file.type === 'application/pdf') {
      // Для PDF извлекаем текст из fullTextAnnotation
      const fullTextAnnotation = result.fullTextAnnotation;
      if (fullTextAnnotation?.text) {
        rawText = fullTextAnnotation.text;
        console.log(`✅ Распознано ${rawText.length} символов из PDF`);
      } else {
        console.log('❌ Текст не найден в PDF');
        return NextResponse.json({
          error: 'Текст не найден в PDF документе',
          suggestions: [
            'Убедитесь, что PDF содержит текстовое содержимое',
            'Попробуйте сконвертировать PDF в изображение',
            'Проверьте, что PDF не защищен от копирования'
          ]
        }, { status: 400 });
      }
    } else {
      // Для изображений используем textAnnotations
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        console.log('❌ Текст не найден в изображении');
        return NextResponse.json({
          error: 'Текст не найден в изображении',
          suggestions: [
            'Используйте более четкое изображение',
            'Убедитесь, что документ полностью в кадре',
            'Проверьте, что изображение содержит читаемый текст',
            'Избегайте бликов и теней'
          ]
        }, { status: 400 });
      }
      
      rawText = detections[0].description || '';
      console.log(`✅ Распознано ${rawText.length} символов из изображения`);
    }
    
    // Извлекаем структурированные данные
    const extractedData = extractInvoiceData(rawText);
    
    // Определяем тип документа
    const lowerText = rawText.toLowerCase();
    let documentType = 'unknown';
    if (lowerText.includes('счет') || lowerText.includes('invoice')) {
      documentType = 'invoice';
    }
    
    const wordCount = rawText.split(/\s+/).filter(word => word.length > 0).length;
    
    return NextResponse.json({
      success: true,
      text: rawText,
      metadata: {
        fileName: file.name,
        fileSize: Math.round(file.size / 1024),
        fileType: file.type,
        charactersCount: rawText.length,
        wordsCount: wordCount,
        confidence: 85, // Примерная уверенность для Google Vision
        processingTime: Date.now(),
        documentType: documentType,
        documentInfo: extractedData
      }
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка в API:', error);
    
    if (error.code === 'UNAUTHENTICATED') {
      return NextResponse.json({
        error: 'Google Vision API не настроен',
        suggestions: [
          'Проверьте настройки Google Cloud Vision API',
          'Убедитесь, что API ключи настроены правильно'
        ]
      }, { status: 500 });
    }
    
    return NextResponse.json({
      error: 'Ошибка сервера',
      details: error.message,
      suggestions: [
        'Попробуйте еще раз',
        'Используйте другое изображение'
      ]
    }, { status: 500 });
  }
}

// Извлечение данных из текста счета
function extractInvoiceData(text: string) {
  const data: any = {
    numbers: [],
    dates: [],
    amounts: [],
    companies: []
  };
  
  try {
    // Числа (потенциальные номера счетов и суммы)
    const numberPattern = /\d+(?:[.,]\d+)*/gi;
    const numbers = text.match(numberPattern) || [];
    data.numbers = numbers.slice(0, 10);
    
    // Даты
    const datePattern = /\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4}/gi;
    const dates = text.match(datePattern) || [];
    data.dates = dates.slice(0, 5);
    
    // Суммы с валютой
    const amountPattern = /\d+(?:[.,]\d+)*\s*(?:руб|₽|RUB|USD|\$|EUR|€)/gi;
    const amounts = text.match(amountPattern) || [];
    data.amounts = amounts.slice(0, 5);
    
    // Названия компаний
    const companyPattern = /(?:ООО|ИП|ЗАО|ОАО|ФГУП)\s+[А-ЯЁ][а-яё\s"]*[А-ЯЁа-яё"]/g;
    const companies = text.match(companyPattern) || [];
    data.companies = companies.slice(0, 3);
    
  } catch (error) {
    console.log('Ошибка при извлечении данных:', error);
  }
  
  return data;
}