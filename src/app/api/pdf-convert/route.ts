import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  let tempPdfPath: string | null = null;
  
  try {
    console.log('🔄 [PDF-CONVERT] Запрос на конвертацию PDF в изображение');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 [PDF-CONVERT] Файл: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({
        error: 'Поддерживаются только PDF файлы'
      }, { status: 400 });
    }
    
    // Пока что просто создаем placeholder изображение
    console.log('🎨 [PDF-CONVERT] Создание placeholder изображения...');
    
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    // Белый фон
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 800, 600);
    
    // Рамка
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 780, 580);
    
    // Текст
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PDF Конвертер', 400, 100);
    
    ctx.font = '16px Arial';
    ctx.fillText(`Файл: ${file.name}`, 400, 200);
    ctx.fillText(`Размер: ${Math.round(file.size/1024)} KB`, 400, 230);
    ctx.fillText('Конвертация PDF в изображение', 400, 300);
    ctx.fillText('(требуется настройка PDF библиотеки)', 400, 330);
    
    // Иконка PDF
    ctx.fillStyle = '#dc3545';
    ctx.fillRect(350, 400, 100, 120);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('PDF', 400, 470);
    
    console.log('🖼️ [PDF-CONVERT] Изображение создано');
    
    // Конвертируем в PNG
    const buffer = canvas.toBuffer('image/png');
    
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '_converted.png')}"`,
        'X-File-Size': Math.round(buffer.length/1024).toString() + 'KB'
      },
    });
    
  } catch (error: any) {
    console.error('❌ [PDF-CONVERT] Ошибка:', error);
    
    return NextResponse.json({
      error: error.message || 'Ошибка конвертации PDF',
      suggestions: [
        'Убедитесь, что PDF файл не поврежден',
        'Попробуйте файл меньшего размера'
      ]
    }, { status: 500 });
  }
}