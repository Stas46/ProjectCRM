import { NextRequest, NextResponse } from 'next/server';
import { createCanvas } from 'canvas';

export async function POST(request: NextRequest) {
  console.log('🔄 [PDF-TO-IMAGE-SIMPLE] Получен запрос на конвертацию PDF');
  
  try {
    // Парсим форму
    console.log('📄 [PDF-TO-IMAGE-SIMPLE] Парсинг формы...');
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      console.log('❌ [PDF-TO-IMAGE-SIMPLE] Файл не найден');
      return NextResponse.json({ 
        success: false, 
        error: 'PDF файл не найден' 
      }, { status: 400 });
    }
    
    console.log(`📁 [PDF-TO-IMAGE-SIMPLE] Файл получен: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);
    
    // Проверяем тип файла
    if (file.type !== 'application/pdf') {
      console.log('❌ [PDF-TO-IMAGE-SIMPLE] Неверный тип файла:', file.type);
      return NextResponse.json({ 
        success: false, 
        error: 'Неверный тип файла. Ожидается PDF.' 
      }, { status: 400 });
    }
    
    // Конвертируем в буфер
    console.log('🔄 [PDF-TO-IMAGE-SIMPLE] Конвертация файла в буфер...');
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`💾 [PDF-TO-IMAGE-SIMPLE] Буфер создан: ${pdfBuffer.length} байт`);
    
    // Полифиллы для Node.js окружения
    console.log('⚙️ [PDF-TO-IMAGE-SIMPLE] Настройка окружения Node.js...');
    
    // DOMMatrix полифилл
    if (typeof globalThis.DOMMatrix === 'undefined') {
      class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        m11 = 1; m12 = 0; m13 = 0; m14 = 0;
        m21 = 0; m22 = 1; m23 = 0; m24 = 0;
        m31 = 0; m32 = 0; m33 = 1; m34 = 0;
        m41 = 0; m42 = 0; m43 = 0; m44 = 1;
        
        static fromFloat32Array() { return new DOMMatrix(); }
        static fromFloat64Array() { return new DOMMatrix(); }
        static fromMatrix() { return new DOMMatrix(); }
      }
      (globalThis as any).DOMMatrix = DOMMatrix;
      console.log('✅ [PDF-TO-IMAGE-SIMPLE] DOMMatrix полифилл установлен');
    }
    
    // Отключаем все что связано с DOM в Node.js
    if (typeof globalThis.document === 'undefined') {
      (globalThis as any).document = {
        createElement: () => ({
          getContext: () => null,
          width: 0,
          height: 0
        })
      };
      console.log('✅ [PDF-TO-IMAGE-SIMPLE] document полифилл установлен');
    }
    
    // Импортируем PDF.js
    console.log('📚 [PDF-TO-IMAGE-SIMPLE] Импорт PDF.js...');
    
    // Используем стандартный импорт
    const pdfjsModule = await import('pdfjs-dist');
    
    // Простая настройка worker - только установка пути
    try {
      pdfjsModule.GlobalWorkerOptions.workerSrc = 'data:application/javascript;base64,';
      console.log('✅ [PDF-TO-IMAGE-SIMPLE] Worker настроен с data URL');
    } catch (workerError) {
      console.log('⚠️ [PDF-TO-IMAGE-SIMPLE] Не удалось настроить worker, продолжаем без него');
    }
    
    // Загружаем PDF документ
    console.log('📖 [PDF-TO-IMAGE-SIMPLE] Загрузка PDF документа...');
    const loadingTask = pdfjsModule.getDocument({
      data: new Uint8Array(pdfBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      verbosity: 0
    });
    
    const pdfDocument = await loadingTask.promise;
    console.log(`📄 [PDF-TO-IMAGE-SIMPLE] PDF загружен. Страниц: ${pdfDocument.numPages}`);
    
    // Получаем первую страницу
    console.log('📃 [PDF-TO-IMAGE-SIMPLE] Получение первой страницы...');
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    console.log(`📐 [PDF-TO-IMAGE-SIMPLE] Размеры: ${Math.round(viewport.width)}x${Math.round(viewport.height)}`);
    
    // Создаем canvas
    console.log('🎨 [PDF-TO-IMAGE-SIMPLE] Создание canvas...');
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // Рендерим страницу
    console.log('🖼️ [PDF-TO-IMAGE-SIMPLE] Рендеринг...');
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    } as any;
    
    await page.render(renderContext).promise;
    console.log('✅ [PDF-TO-IMAGE-SIMPLE] Рендеринг завершен');
    
    // Конвертируем в PNG
    console.log('💾 [PDF-TO-IMAGE-SIMPLE] Создание PNG...');
    const imageBuffer = canvas.toBuffer('image/png');
    console.log(`📤 [PDF-TO-IMAGE-SIMPLE] PNG готов: ${Math.round(imageBuffer.length / 1024)}KB`);
    
    // Возвращаем изображение
    return new NextResponse(imageBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.log('❌ [PDF-TO-IMAGE-SIMPLE] Ошибка:', error.message);
    console.log('📍 [PDF-TO-IMAGE-SIMPLE] Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка конвертации PDF'
    }, { status: 500 });
  }
}