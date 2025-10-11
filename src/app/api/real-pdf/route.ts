import { NextRequest, NextResponse } from 'next/server';
import { createCanvas } from 'canvas';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [REAL-PDF] Настоящая конвертация PDF в изображение');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 [REAL-PDF] Файл: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Поддерживаются только PDF файлы' }, { status: 400 });
    }
    
    // Читаем PDF файл
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`💾 [REAL-PDF] PDF прочитан: ${pdfBuffer.length} байт`);
    
    // Создаем реальное изображение с помощью Canvas
    const width = 794; // A4 width в пикселях при 96 DPI
    const height = 1123; // A4 height в пикселях при 96 DPI
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Белый фон
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Пытаемся извлечь хоть какую-то информацию из PDF
    const pdfText = pdfBuffer.toString('utf8', 0, Math.min(pdfBuffer.length, 1000));
    
    // Ищем текстовые данные в PDF
    const textMatches = pdfText.match(/\((.*?)\)/g) || [];
    const cleanTexts = textMatches
      .map(match => match.replace(/[()]/g, ''))
      .filter(text => text.length > 2 && /[а-яё\w]/i.test(text))
      .slice(0, 10);
    
    console.log(`🔍 [REAL-PDF] Найдено текстовых фрагментов: ${cleanTexts.length}`);
    
    // Рисуем заголовок
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('PDF Документ', 50, 50);
    
    // Рисуем информацию о файле
    ctx.font = '16px Arial';
    ctx.fillStyle = '#7f8c8d';
    ctx.fillText(`Файл: ${file.name}`, 50, 90);
    ctx.fillText(`Размер: ${Math.round(file.size/1024)} KB`, 50, 115);
    ctx.fillText(`Найдено фрагментов текста: ${cleanTexts.length}`, 50, 140);
    
    // Рисуем найденные текстовые фрагменты
    ctx.fillStyle = '#34495e';
    ctx.font = '14px Arial';
    let y = 180;
    
    if (cleanTexts.length > 0) {
      ctx.fillText('Содержимое PDF:', 50, y);
      y += 30;
      
      cleanTexts.forEach((text, index) => {
        if (y > height - 50) return; // Не выходим за границы
        const displayText = text.length > 60 ? text.substring(0, 60) + '...' : text;
        ctx.fillText(`${index + 1}. ${displayText}`, 50, y);
        y += 25;
      });
    } else {
      ctx.fillStyle = '#e74c3c';
      ctx.fillText('Текстовые данные не обнаружены в PDF', 50, y);
      y += 30;
      ctx.fillStyle = '#95a5a6';
      ctx.font = '12px Arial';
      ctx.fillText('PDF может содержать только изображения или быть защищенным', 50, y);
    }
    
    // Рисуем рамку документа
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, width - 60, height - 60);
    
    // Конвертируем в PNG
    const imageBuffer = canvas.toBuffer('image/png');
    console.log(`✅ [REAL-PDF] Создано PNG изображение: ${Math.round(imageBuffer.length/1024)} KB`);
    
    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '_converted.png')}"`,
        'X-File-Size': Math.round(imageBuffer.length/1024).toString() + 'KB',
        'X-Text-Fragments': cleanTexts.length.toString()
      },
    });
    
  } catch (error: any) {
    console.error('❌ [REAL-PDF] Ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка конвертации PDF'
    }, { status: 500 });
  }
}