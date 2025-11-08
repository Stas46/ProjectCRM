import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    console.log('📁 [FILES-API] Запрос файла:', filename);
    
    // Проверяем безопасность имени файла
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.log('❌ [FILES-API] Недопустимое имя файла:', filename);
      return NextResponse.json({ error: 'Недопустимое имя файла' }, { status: 400 });
    }

    // Путь к папке temp
    const tempDir = join(process.cwd(), 'temp');
    const filePath = join(tempDir, filename);
    console.log('📂 [FILES-API] Путь к файлу:', filePath);

    // Проверяем существование файла
    if (!existsSync(filePath)) {
      console.log('❌ [FILES-API] Файл не найден:', filePath);
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    console.log('✅ [FILES-API] Файл найден, читаем...');
    // Читаем файл
    const fileBuffer = await readFile(filePath);
    console.log('📄 [FILES-API] Файл прочитан, размер:', fileBuffer.length, 'байт');
    
    // Определяем MIME тип на основе расширения
    let contentType = 'application/octet-stream';
    if (filename.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (filename.toLowerCase().endsWith('.png')) {
      contentType = 'image/png';
    } else if (filename.toLowerCase().endsWith('.xlsx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (filename.toLowerCase().endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    console.log('🎯 [FILES-API] MIME тип:', contentType);

    // Возвращаем файл с правильными заголовками
    const response = new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
    
    console.log('✅ [FILES-API] Файл успешно отправлен');
    return response;

  } catch (error: any) {
    console.error('❌ [FILES-API] Ошибка получения файла:', error);
    return NextResponse.json({ 
      error: error.message || 'Ошибка получения файла' 
    }, { status: 500 });
  }
}