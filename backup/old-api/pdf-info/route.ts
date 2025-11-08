import { NextRequest, NextResponse } from 'next/server';
import { createCanvas } from 'canvas';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  console.log('🔄 [PDF-INFO] Получен запрос на обработку PDF');
  
  try {
    // Парсим форму
    console.log('📄 [PDF-INFO] Парсинг формы...');
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      console.log('❌ [PDF-INFO] Файл не найден');
      return NextResponse.json({ 
        success: false, 
        error: 'PDF файл не найден' 
      }, { status: 400 });
    }
    
    console.log(`📁 [PDF-INFO] Файл получен: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);
    
    // Проверяем тип файла
    if (file.type !== 'application/pdf') {
      console.log('❌ [PDF-INFO] Неверный тип файла:', file.type);
      return NextResponse.json({ 
        success: false, 
        error: 'Неверный тип файла. Ожидается PDF.' 
      }, { status: 400 });
    }
    
    // Конвертируем в буфер
    console.log('🔄 [PDF-INFO] Конвертация файла в буфер...');
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`💾 [PDF-INFO] Буфер создан: ${pdfBuffer.length} байт`);
    
    // Создаем простое информационное изображение без парсинга PDF
    console.log('🎨 [PDF-INFO] Создание информационного изображения...');
    
    // Настройки canvas
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Заливаем градиентным фоном
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Рисуем рамку
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    
    // Настраиваем текст
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    
    // Заголовок
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText('📄 PDF Файл Получен', width / 2, 100);
    
    // Информация о файле
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = '#334155';
    
    const fileInfo = [
      `Имя файла: ${file.name}`,
      `Размер: ${Math.round(file.size / 1024)} КБ`,
      `Тип: ${file.type}`,
      `Буфер: ${pdfBuffer.length} байт`,
      '',
      '✅ Файл успешно загружен',
      '🔧 Готов к обработке Google Vision OCR',
      '',
      'Теперь можно использовать этот файл',
      'для распознавания текста!'
    ];
    
    fileInfo.forEach((line, index) => {
      const yPos = 180 + (index * 35);
      if (line === '') return; // Пропускаем пустые строки
      
      if (line.includes('✅') || line.includes('🔧')) {
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 20px Arial, sans-serif';
      } else {
        ctx.fillStyle = '#334155';
        ctx.font = '18px Arial, sans-serif';
      }
      
      ctx.fillText(line, width / 2, yPos);
    });
    
    // Добавляем текущее время
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Arial, sans-serif';
    const now = new Date().toLocaleString('ru-RU');
    ctx.fillText(`Обработано: ${now}`, width / 2, height - 50);
    
    // Конвертируем в PNG
    console.log('💾 [PDF-INFO] Создание PNG...');
    const imageBuffer = canvas.toBuffer('image/png');
    
    // Оптимизируем с помощью Sharp
    console.log('🔧 [PDF-INFO] Оптимизация изображения...');
    const optimizedBuffer = await sharp(imageBuffer)
      .png({ 
        compressionLevel: 6,
        quality: 90 
      })
      .toBuffer();
    
    console.log(`📤 [PDF-INFO] Информационное изображение готово: ${Math.round(optimizedBuffer.length / 1024)}KB`);
    
    // Возвращаем изображение
    return new NextResponse(optimizedBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': optimizedBuffer.length.toString(),
        'X-PDF-Size': file.size.toString(),
        'X-PDF-Name': file.name
      },
    });

  } catch (error: any) {
    console.log('❌ [PDF-INFO] Ошибка:', error.message);
    console.log('📍 [PDF-INFO] Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка обработки PDF'
    }, { status: 500 });
  }
}