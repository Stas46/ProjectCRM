import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Создаем директорию temp если её нет
    const tempDir = path.join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Создаем уникальное имя файла
    const timestamp = Date.now();
    const fileName = `upload_${timestamp}_${file.name}`;
    const filePath = path.join(tempDir, fileName);

    // Сохраняем файл
    await writeFile(filePath, buffer);

    const fileInfo: FileInfo = {
      name: file.name,
      size: file.size,
      type: file.type
    };

    // Обрабатываем только текстовые файлы
    if (file.type === 'text/plain') {
      try {
        const result = await runParser(filePath);
        return NextResponse.json({
          success: true,
          message: 'Файл успешно обработан',
          file_info: fileInfo,
          result: result
        });
      } catch (error) {
        console.error('Ошибка парсера:', error);
        return NextResponse.json({
          success: false,
          error: 'Ошибка при обработке файла',
          file_info: fileInfo
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'OCR не настроен для файлов типа ' + file.type + '. Поддерживается только text/plain.',
        file_info: fileInfo
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Ошибка API:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

async function runParser(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'python-scripts', 'ultimate_invoice_parser.py');
    
    const pythonProcess = spawn('python', [pythonScript, '--file', filePath, '--debug'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Ищем JSON в выводе
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            resolve(result);
          } else {
            resolve({ raw_output: output });
          }
        } catch (parseError) {
          resolve({ raw_output: output });
        }
      } else {
        reject(new Error(`Python процесс завершился с кодом ${code}. Ошибка: ${error}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(err);
    });
  });
}
