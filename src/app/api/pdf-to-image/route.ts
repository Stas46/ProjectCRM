import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';



export async function POST(request: NextRequest) {

  try {

    return NextResponse.json({export async function POST(request: NextRequest) {import pdf2pic from 'pdf2pic';import pdf2pic from 'pdf2pic';

      success: false,

      error: 'API временно отключен'  try {

    });

  } catch (error) {    return NextResponse.json({import fs from 'fs';import fs from 'fs';

    return NextResponse.json(

      { success: false, error: 'Ошибка API' },      success: false,

      { status: 500 }

    );      error: 'API временно отключен'import path from 'path';import path from 'path';

  }

}    });

  } catch (error) {

    return NextResponse.json(

      { success: false, error: 'Ошибка API' },export async function POST(request: NextRequest) {export async function POST(request: NextRequest) {

      { status: 500 }

    );  const tempDir = path.join(process.cwd(), 'temp');  const tempDir = path.join(process.cwd(), 'temp');

  }

}    

  try {  try {

    console.log('🔧 [PDF-TO-IMAGE] Получение данных...');    console.log('🔧 [PDF-TO-IMAGE] Получение данных...');

        

    const formData = await request.formData();    const formData = await request.formData();

    const file = formData.get('file') as File;    const file = formData.get('file') as File;

        

    if (!file) {    if (!file) {

      return NextResponse.json(      return NextResponse.json(

        { success: false, error: 'Файл не предоставлен' },        { success: false, error: 'Файл не предоставлен' },

        { status: 400 }        { status: 400 }

      );      );

    }    }



    // Убеждаемся что temp директория существует    // Убеждаемся что temp директория существует

    if (!fs.existsSync(tempDir)) {    if (!fs.existsSync(tempDir)) {

      fs.mkdirSync(tempDir, { recursive: true });      fs.mkdirSync(tempDir, { recursive: true });

    }    }



    // Сохраняем загруженный файл    // Сохраняем загруженный файл

    const tempPdfPath = path.join(tempDir, `${Date.now()}.pdf`);    const tempPdfPath = path.join(tempDir, `${Date.now()}.pdf`);

    const buffer = Buffer.from(await file.arrayBuffer());    const buffer = Buffer.from(await file.arrayBuffer());

    fs.writeFileSync(tempPdfPath, buffer);    fs.writeFileSync(tempPdfPath, buffer);



    console.log('🔧 [PDF-TO-IMAGE] Настройка pdf2pic...');    console.log('🔧 [PDF-TO-IMAGE] Настройка pdf2pic...');

        

    const convert = pdf2pic.fromPath(tempPdfPath, {    const convert = pdf2pic.fromPath(tempPdfPath, {

      density: 300,      density: 300,

      saveFilename: 'page',      saveFilename: 'page',

      savePath: tempDir,      savePath: tempDir,

      format: 'png',      format: 'png',

      width: 2480,      width: 2480,

      height: 3508      height: 3508

    });    });



    console.log('🔄 [PDF-TO-IMAGE] Конвертация PDF в изображения...');    console.log('🔄 [PDF-TO-IMAGE] Конвертация PDF в изображения...');

        

    const results = await convert.bulk(-1, { responseType: 'base64' });    const results = await convert.bulk(-1, { responseType: 'base64' });

        

    console.log(`✅ [PDF-TO-IMAGE] Конвертировано ${results.length} страниц`);    console.log(`✅ [PDF-TO-IMAGE] Конвертировано ${results.length} страниц`);



    // Очищаем временный PDF файл    // Очищаем временный PDF файл

    try {    try {

      fs.unlinkSync(tempPdfPath);      fs.unlinkSync(tempPdfPath);

    } catch (e) {    } catch (e) {

      console.warn('⚠️ [PDF-TO-IMAGE] Не удалось удалить временный PDF файл:', e);      console.warn('⚠️ [PDF-TO-IMAGE] Не удалось удалить временный PDF файл:', e);

    }    }



    const images = results.map((result, index) => ({    const images = results.map((result, index) => ({

      page: index + 1,      page: index + 1,

      base64: result.base64,      base64: result.base64,

      path: result.path,      path: result.path,

      size: result.size      size: result.size

    }));    }));



    return NextResponse.json({    return NextResponse.json({

      success: true,      success: true,

      page_count: results.length,      page_count: results.length,

      images: images      images: images

    });    });



  } catch (error) {  } catch (error) {

    console.error('❌ [PDF-TO-IMAGE] Ошибка конвертации:', error);    console.error('❌ [PDF-TO-IMAGE] Ошибка конвертации:', error);

        

    return NextResponse.json(    return NextResponse.json(

      {       { 

        success: false,         success: false, 

        error: error instanceof Error ? error.message : 'Неизвестная ошибка конвертации'        error: error instanceof Error ? error.message : 'Неизвестная ошибка конвертации'

      },      },

      { status: 500 }      { status: 500 }

    );    );

  }  }

}}

import path from 'path';

import os from 'os';import fs from 'fs';      density: 100,           // Уменьшаем DPI для теста



export async function POST(request: NextRequest) {import path from 'path';      saveFilename: "page",

  let tempPdfPath: string | null = null;

  import os from 'os';      savePath: os.tmpdir(),

  try {

    console.log('🔄 [PDF-TO-IMAGE] Запрос на конвертацию PDF в изображение');      format: "png"

    

    const formData = await request.formData();export async function POST(request: NextRequest) {      // Убираем width/height ограничения

    const file = formData.get('file') as File;

      let tempPdfPath: string | null = null;    });/server';

    if (!file) {

      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });  import pdf2pic from 'pdf2pic';

    }

      try {import fs from 'fs';

    console.log(`📄 [PDF-TO-IMAGE] Файл: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);

        console.log('🔄 [PDF-TO-IMAGE] Запрос на конвертацию PDF в изображение');import path from 'path';

    if (file.type !== 'application/pdf') {

      return NextResponse.json({    import os from 'os';

        error: 'Неподдерживаемый тип файла',

        suggestions: ['Используйте только PDF файлы']    const formData = await request.formData();

      }, { status: 400 });

    }    const file = formData.get('file') as File;export async function POST(request: NextRequest) {

    

    console.log('🔄 [PDF-TO-IMAGE] Конвертация файла в буфер...');      let tempPdfPath: string | null = null;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    console.log(`💾 [PDF-TO-IMAGE] Буфер создан: ${fileBuffer.length} байт`);    if (!file) {  

    

    // Создаем временный файл      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });  try {

    console.log('📁 [PDF-TO-IMAGE] Создание временного файла...');

    tempPdfPath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);    }    console.log('🔄 [PDF-TO-IMAGE] Запрос на конвертацию PDF в изображение');

    fs.writeFileSync(tempPdfPath, fileBuffer);

    console.log(`💾 [PDF-TO-IMAGE] Временный файл создан: ${tempPdfPath}`);        

    

    console.log('🔧 [PDF-TO-IMAGE] Настройка pdf2pic...');    console.log(`📄 [PDF-TO-IMAGE] Файл: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);    const formData = await request.formData();

    

    const convert = pdf2pic.fromPath(tempPdfPath, {        const file = formData.get('file') as File;

      density: 150,

      saveFilename: "page",    if (file.type !== 'application/pdf') {    

      savePath: os.tmpdir(),

      format: "png"      return NextResponse.json({    if (!file) {

    });

            error: 'Неподдерживаемый тип файла',      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });

    console.log('🖼️ [PDF-TO-IMAGE] Конвертация первой страницы...');

            suggestions: ['Используйте только PDF файлы']    }

    // Сначала пробуем стандартный вызов

    let result = await convert(1);      }, { status: 400 });    

    

    console.log('🔍 [PDF-TO-IMAGE] Результат:', {    }    console.log(`📄 [PDF-TO-IMAGE] Файл: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);

      hasBuffer: !!result.buffer,

      hasPath: !!result.path,        

      bufferLength: result.buffer ? result.buffer.length : 0,

      path: result.path    console.log('🔄 [PDF-TO-IMAGE] Конвертация файла в буфер...');    if (file.type !== 'application/pdf') {

    });

        const fileBuffer = Buffer.from(await file.arrayBuffer());      return NextResponse.json({

    // Если есть path но нет buffer, читаем файл

    if (result.path && fs.existsSync(result.path) && (!result.buffer || result.buffer.length === 0)) {    console.log(`💾 [PDF-TO-IMAGE] Буфер создан: ${fileBuffer.length} байт`);        error: 'Неподдерживаемый тип файла',

      console.log('📁 [PDF-TO-IMAGE] Чтение файла изображения...');

      const imageBuffer = fs.readFileSync(result.path);            suggestions: ['Используйте только PDF файлы']

      console.log(`📁 [PDF-TO-IMAGE] Прочитан файл: ${Math.round(imageBuffer.length/1024)}KB`);

          // Создаем временный файл      }, { status: 400 });

      // Удаляем временный файл изображения

      fs.unlinkSync(result.path);    console.log('📁 [PDF-TO-IMAGE] Создание временного файла...');    }

      

      return new NextResponse(new Uint8Array(imageBuffer), {    tempPdfPath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);    

        status: 200,

        headers: {    fs.writeFileSync(tempPdfPath, fileBuffer);    console.log('🔄 [PDF-TO-IMAGE] Конвертация файла в буфер...');

          'Content-Type': 'image/png',

          'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.png')}"`,    console.log(`💾 [PDF-TO-IMAGE] Временный файл создан: ${tempPdfPath}`);    const fileBuffer = Buffer.from(await file.arrayBuffer());

          'X-File-Size': Math.round(imageBuffer.length/1024).toString() + 'KB'

        },        console.log(`💾 [PDF-TO-IMAGE] Буфер создан: ${fileBuffer.length} байт`);

      });

    }    console.log('🔧 [PDF-TO-IMAGE] Настройка pdf2pic...');    

    

    // Если есть buffer, используем его        // Создаем временный файл

    if (result.buffer && result.buffer.length > 0) {

      console.log(`✅ [PDF-TO-IMAGE] Конвертация завершена: ${Math.round(result.buffer.length/1024)}KB`);    // Пробуем разные настройки    console.log('� [PDF-TO-IMAGE] Создание временного файла...');

      

      return new NextResponse(new Uint8Array(result.buffer), {    const options = {    tempPdfPath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);

        status: 200,

        headers: {      density: 100,    fs.writeFileSync(tempPdfPath, fileBuffer);

          'Content-Type': 'image/png',

          'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.png')}"`,      saveFilename: "page",    console.log(`� [PDF-TO-IMAGE] Временный файл создан: ${tempPdfPath}`);

          'X-File-Size': Math.round(result.buffer.length/1024).toString() + 'KB'

        },      savePath: os.tmpdir(),    

      });

    }      format: "png" as const,    console.log('� [PDF-TO-IMAGE] Настройка pdf2pic...');

    

    throw new Error('Не удалось получить изображение из PDF');    };    const convert = pdf2pic.fromPath(tempPdfPath, {

    

  } catch (error: any) {          density: 200,           // DPI

    console.error('❌ [PDF-TO-IMAGE] Ошибка:', error);

        console.log('⚙️ [PDF-TO-IMAGE] Опции pdf2pic:', options);      saveFilename: "page",

    let suggestions = [

      'Убедитесь, что PDF файл не поврежден',          savePath: os.tmpdir(),

      'Попробуйте файл меньшего размера'

    ];    const convert = pdf2pic.fromPath(tempPdfPath, options);      format: "png",

    

    if (error.message?.includes('spawn') || error.code === 'ENOENT') {          width: 1200,           // Максимальная ширина

      suggestions = [

        'Требуется установка poppler-utils',    console.log('🖼️ [PDF-TO-IMAGE] Конвертация первой страницы...');      height: 1600           // Максимальная высота

        'Скачайте: https://github.com/oschwartz10612/poppler-windows/releases/',

        'Добавьте bin папку в PATH',        });

        'Перезапустите сервер'

      ];    // Пробуем без responseType сначала    

    }

        console.log('🔍 [PDF-TO-IMAGE] Попытка 1: без responseType');    console.log('🖼️ [PDF-TO-IMAGE] Конвертация первой страницы...');

    return NextResponse.json({

      success: false,    let result = await convert(1);    const result = await convert(1, { responseType: "buffer" });

      error: error.message || 'Ошибка конвертации PDF',

      suggestions        

    }, { status: 500 });

  } finally {    console.log('🔍 [PDF-TO-IMAGE] Результат попытки 1:', {    console.log('🔍 [PDF-TO-IMAGE] Результат конвертации:', {

    // Очищаем временный файл

    if (tempPdfPath && fs.existsSync(tempPdfPath)) {      hasBuffer: !!result.buffer,      hasBuffer: !!result.buffer,

      try {

        fs.unlinkSync(tempPdfPath);      hasBase64: !!result.base64,      bufferLength: result.buffer ? result.buffer.length : 0,

        console.log('🗑️ [PDF-TO-IMAGE] Временный файл удален');

      } catch (cleanupError) {      hasPath: !!result.path,      resultKeys: Object.keys(result),

        console.warn('⚠️ [PDF-TO-IMAGE] Не удалось удалить временный файл:', cleanupError);

      }      resultKeys: Object.keys(result),      result: result

    }

  }      bufferLength: result.buffer ? result.buffer.length : 0    });

}
    });    

        if (!result.buffer) {

    // Если нет буфера, пробуем с responseType: "buffer"      throw new Error('Не удалось получить изображение из PDF');

    if (!result.buffer || result.buffer.length === 0) {    }

      console.log('🔍 [PDF-TO-IMAGE] Попытка 2: с responseType buffer');    

      result = await convert(1, { responseType: "buffer" });    if (result.buffer.length === 0) {

            throw new Error('Получен пустой буфер изображения');

      console.log('🔍 [PDF-TO-IMAGE] Результат попытки 2:', {    }

        hasBuffer: !!result.buffer,    

        hasBase64: !!result.base64,    console.log(`✅ [PDF-TO-IMAGE] Конвертация завершена: ${Math.round(result.buffer.length/1024)}KB`);

        hasPath: !!result.path,    

        resultKeys: Object.keys(result),    return new NextResponse(new Uint8Array(result.buffer), {

        bufferLength: result.buffer ? result.buffer.length : 0      status: 200,

      });      headers: {

    }        'Content-Type': 'image/png',

            'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.png')}"`,

    // Если все еще нет буфера, пробуем прочитать из файла        'X-Page-Number': '1',

    if (!result.buffer || result.buffer.length === 0) {        'X-File-Size': Math.round(result.buffer.length/1024).toString() + 'KB'

      console.log('🔍 [PDF-TO-IMAGE] Попытка 3: чтение из файла');      },

      if (result.path && fs.existsSync(result.path)) {    });

        const imageBuffer = fs.readFileSync(result.path);    

        console.log(`📁 [PDF-TO-IMAGE] Прочитан файл: ${result.path} (${imageBuffer.length} байт)`);  } catch (error: any) {

            console.error('❌ [PDF-TO-IMAGE] Ошибка:', error);

        // Удаляем временный файл изображения    

        fs.unlinkSync(result.path);    let suggestions = [

              'Убедитесь, что PDF файл не поврежден',

        return new NextResponse(new Uint8Array(imageBuffer), {      'Попробуйте файл меньшего размера',

          status: 200,      'Проверьте, что файл действительно является PDF'

          headers: {    ];

            'Content-Type': 'image/png',    

            'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.png')}"`,    if (error.message?.includes('spawn')) {

            'X-Page-Number': '1',      suggestions = [

            'X-File-Size': Math.round(imageBuffer.length/1024).toString() + 'KB'        'Не установлен poppler-utils',

          },        'Скачайте poppler для Windows с https://github.com/oschwartz10612/poppler-windows/releases/',

        });        'Добавьте poppler/bin в PATH'

      }      ];

    }    }

        

    if (!result.buffer || result.buffer.length === 0) {    return NextResponse.json({

      throw new Error('Не удалось получить изображение из PDF. Возможно, не установлен poppler-utils.');      success: false,

    }      error: error.message || 'Произошла ошибка при конвертации PDF',

          suggestions

    console.log(`✅ [PDF-TO-IMAGE] Конвертация завершена: ${Math.round(result.buffer.length/1024)}KB`);    }, { status: 500 });

      } finally {

    return new NextResponse(new Uint8Array(result.buffer), {    // Очищаем временный файл

      status: 200,    if (tempPdfPath && fs.existsSync(tempPdfPath)) {

      headers: {      try {

        'Content-Type': 'image/png',        fs.unlinkSync(tempPdfPath);

        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.png')}"`,        console.log('🗑️ [PDF-TO-IMAGE] Временный файл удален');

        'X-Page-Number': '1',      } catch (cleanupError) {

        'X-File-Size': Math.round(result.buffer.length/1024).toString() + 'KB'        console.warn('⚠️ [PDF-TO-IMAGE] Не удалось удалить временный файл:', cleanupError);

      },      }

    });    }

      }

  } catch (error: any) {}
    console.error('❌ [PDF-TO-IMAGE] Ошибка:', error);
    
    let suggestions = [
      'Убедитесь, что PDF файл не поврежден',
      'Попробуйте файл меньшего размера',
      'Проверьте, что файл действительно является PDF'
    ];
    
    if (error.message?.includes('spawn') || error.message?.includes('poppler')) {
      suggestions = [
        'Не установлен poppler-utils',
        'Скачайте poppler для Windows с https://github.com/oschwartz10612/poppler-windows/releases/',
        'Добавьте poppler/bin в PATH',
        'Перезапустите терминал и сервер'
      ];
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Произошла ошибка при конвертации PDF',
      suggestions
    }, { status: 500 });
  } finally {
    // Очищаем временный файл
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try {
        fs.unlinkSync(tempPdfPath);
        console.log('🗑️ [PDF-TO-IMAGE] Временный файл удален');
      } catch (cleanupError) {
        console.warn('⚠️ [PDF-TO-IMAGE] Не удалось удалить временный файл:', cleanupError);
      }
    }
  }
}