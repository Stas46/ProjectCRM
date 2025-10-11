import { NextRequest, NextResponse } from 'next/server';
import { createCanvas } from 'canvas';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  console.log('🔄 [PDF-TEXT-IMAGE] Получен запрос на конвертацию PDF');
  
  try {
    // Парсим форму
    console.log('📄 [PDF-TEXT-IMAGE] Парсинг формы...');
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      console.log('❌ [PDF-TEXT-IMAGE] Файл не найден');
      return NextResponse.json({ 
        success: false, 
        error: 'PDF файл не найден' 
      }, { status: 400 });
    }
    
    console.log(`📁 [PDF-TEXT-IMAGE] Файл получен: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);
    
    // Конвертируем в буфер
    console.log('🔄 [PDF-TEXT-IMAGE] Конвертация файла в буфер...');
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`💾 [PDF-TEXT-IMAGE] Буфер создан: ${pdfBuffer.length} байт`);
    
    // Извлекаем текст из PDF
    console.log('📝 [PDF-TEXT-IMAGE] Извлечение текста из PDF...');
    console.log('📦 [PDF-TEXT-IMAGE] Загрузка pdf-parse...');
    
    // Динамический импорт pdf-parse
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    const text = data.text;
    
    console.log(`📊 [PDF-TEXT-IMAGE] Извлечено ${text.length} символов`);
    console.log(`📄 [PDF-TEXT-IMAGE] Страниц: ${data.numpages}`);
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Не удалось извлечь текст из PDF'
      }, { status: 400 });
    }
    
    // Создаем изображение из текста
    console.log('🎨 [PDF-TEXT-IMAGE] Создание изображения из текста...');
    
    // Разбиваем текст на строки и ограничиваем длину
    const lines = text.split('\n').filter((line: string) => line.trim().length > 0);
    const maxLines = 50; // Ограничиваем количество строк
    const displayLines = lines.slice(0, maxLines);
    
    // Настройки canvas
    const lineHeight = 24;
    const padding = 40;
    const maxWidth = 800;
    const fontSize = 16;
    
    // Рассчитываем высоту
    const canvasHeight = displayLines.length * lineHeight + padding * 2;
    
    // Создаем canvas
    const canvas = createCanvas(maxWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    // Заливаем белым фоном
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, maxWidth, canvasHeight);
    
    // Настраиваем текст
    ctx.fillStyle = '#333333';
    ctx.font = `${fontSize}px Arial, sans-serif`;
    
    // Рисуем текст
    console.log('✏️ [PDF-TEXT-IMAGE] Рендеринг текста...');
    displayLines.forEach((line: string, index: number) => {
      const y = padding + (index + 1) * lineHeight;
      
      // Обрезаем длинные строки
      let displayLine = line.trim();
      if (displayLine.length > 100) {
        displayLine = displayLine.substring(0, 97) + '...';
      }
      
      ctx.fillText(displayLine, padding, y);
    });
    
    // Добавляем информацию о количестве страниц
    if (lines.length > maxLines) {
      ctx.fillStyle = '#666666';
      ctx.font = `${fontSize - 2}px Arial, sans-serif`;
      const infoText = `... и еще ${lines.length - maxLines} строк (всего страниц: ${data.numpages})`;
      ctx.fillText(infoText, padding, canvasHeight - padding/2);
    }
    
    // Конвертируем в PNG
    console.log('💾 [PDF-TEXT-IMAGE] Создание PNG...');
    const imageBuffer = canvas.toBuffer('image/png');
    
    // Опционально - оптимизируем с помощью Sharp
    console.log('🔧 [PDF-TEXT-IMAGE] Оптимизация изображения...');
    const optimizedBuffer = await sharp(imageBuffer)
      .png({ 
        compressionLevel: 6,
        quality: 90 
      })
      .toBuffer();
    
    console.log(`📤 [PDF-TEXT-IMAGE] Изображение готово: ${Math.round(optimizedBuffer.length / 1024)}KB`);
    
    // Возвращаем изображение
    return new NextResponse(optimizedBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': optimizedBuffer.length.toString(),
        'X-PDF-Pages': data.numpages.toString(),
        'X-Text-Length': text.length.toString()
      },
    });

  } catch (error: any) {
    console.log('❌ [PDF-TEXT-IMAGE] Ошибка:', error.message);
    console.log('📍 [PDF-TEXT-IMAGE] Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка конвертации PDF'
    }, { status: 500 });
  }
}