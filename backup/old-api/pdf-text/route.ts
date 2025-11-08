import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createCanvas } from 'canvas';

// Инициализация Google Vision API
const vision = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [PDF-TEXT] Извлечение текста из PDF через Google Vision');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 [PDF-TEXT] Файл: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Поддерживаются только PDF файлы' }, { status: 400 });
    }
    
    // Читаем PDF файл
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`💾 [PDF-TEXT] PDF прочитан: ${pdfBuffer.length} байт`);
    
    // Отправляем PDF в Google Vision для извлечения текста
    const [result] = await vision.documentTextDetection({
      image: {
        content: pdfBuffer.toString('base64'),
      },
    });
    
    const detections = result.textAnnotations;
    let extractedText = '';
    
    if (detections && detections.length > 0) {
      // Первый элемент содержит весь текст
      extractedText = detections[0].description || '';
      console.log(`✅ [PDF-TEXT] Извлечено ${extractedText.length} символов текста`);
    } else {
      console.log('⚠️ [PDF-TEXT] Текст не найден');
      extractedText = 'Текст не найден в PDF документе';
    }
    
    // Разбиваем текст на строки для лучшего отображения
    const lines = extractedText.split('\n').filter(line => line.trim().length > 0);
    
    // Анализируем текст на предмет важной информации
    const analysis = analyzeText(extractedText);
    
    // Создаем красивое изображение с текстом
    const imageBuffer = createTextImage(lines, analysis, file.name);
    
    console.log(`🖼️ [PDF-TEXT] Создано изображение: ${Math.round(imageBuffer.length/1024)}KB`);
    
    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '_text.png')}"`,
        'X-File-Size': Math.round(imageBuffer.length/1024).toString() + 'KB',
        'X-Text-Length': extractedText.length.toString(),
        'X-Lines-Count': lines.length.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('❌ [PDF-TEXT] Ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка извлечения текста из PDF'
    }, { status: 500 });
  }
}

function analyzeText(text: string) {
  const analysis = {
    totalChars: text.length,
    words: text.split(/\s+/).filter(w => w.length > 0).length,
    lines: text.split('\n').filter(l => l.trim().length > 0).length,
    russianWords: (text.match(/[а-яё]+/gi) || []).length,
    numbers: (text.match(/\d+/g) || []).length,
    emails: (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).length,
    phones: (text.match(/[\+]?[0-9\s\-\(\)]{10,}/g) || []).length,
    dates: (text.match(/\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}/g) || []).length,
    amounts: (text.match(/\d+[\s,.]?\d*\s*(руб|₽|RUB|рублей)/gi) || []).length,
  };
  
  return analysis;
}

function createTextImage(lines: string[], analysis: any, fileName: string) {
  const width = 1000;
  const lineHeight = 20;
  const padding = 40;
  const headerHeight = 200;
  const maxLines = Math.min(lines.length, 50); // Ограничиваем количество строк
  const height = headerHeight + (maxLines * lineHeight) + padding * 2;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Градиентный фон
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#f8f9fa');
  gradient.addColorStop(1, '#e9ecef');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Рамка
  ctx.strokeStyle = '#dee2e6';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  
  // Заголовок
  ctx.fillStyle = '#2c3e50';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('📄 Извлеченный текст из PDF', width / 2, 50);
  
  // Имя файла
  ctx.font = '16px Arial';
  ctx.fillStyle = '#7f8c8d';
  ctx.fillText(fileName, width / 2, 80);
  
  // Статистика
  ctx.textAlign = 'left';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#34495e';
  
  const statsY = 110;
  ctx.fillText(`📊 Статистика: ${analysis.words} слов, ${analysis.lines} строк, ${analysis.russianWords} русских слов`, padding, statsY);
  ctx.fillText(`🔢 Найдено: ${analysis.numbers} чисел, ${analysis.dates} дат, ${analysis.amounts} сумм`, padding, statsY + 25);
  
  // Разделитель
  ctx.strokeStyle = '#bdc3c7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerHeight - 20);
  ctx.lineTo(width - padding, headerHeight - 20);
  ctx.stroke();
  
  // Текст
  ctx.font = '12px Arial';
  ctx.fillStyle = '#2c3e50';
  ctx.textAlign = 'left';
  
  let y = headerHeight;
  
  for (let i = 0; i < maxLines; i++) {
    if (i >= lines.length) break;
    
    let line = lines[i].trim();
    if (line.length > 100) {
      line = line.substring(0, 100) + '...';
    }
    
    // Выделяем важные строки
    if (line.match(/\d+[\s,.]?\d*\s*(руб|₽|RUB|рублей)/gi)) {
      ctx.fillStyle = '#27ae60'; // Зеленый для сумм
    } else if (line.match(/\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}/)) {
      ctx.fillStyle = '#3498db'; // Синий для дат
    } else {
      ctx.fillStyle = '#2c3e50'; // Обычный цвет
    }
    
    ctx.fillText(`${i + 1}. ${line}`, padding, y);
    y += lineHeight;
  }
  
  if (lines.length > maxLines) {
    ctx.fillStyle = '#95a5a6';
    ctx.fillText(`... и еще ${lines.length - maxLines} строк`, padding, y + 10);
  }
  
  // Подпись
  ctx.fillStyle = '#95a5a6';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Обработано Google Vision API', width / 2, height - 20);
  
  return canvas.toBuffer('image/png');
}