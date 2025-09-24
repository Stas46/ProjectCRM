import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    // Проверяем наличие переменной окружения
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialsPath) {
      return NextResponse.json({ 
        success: false, 
        error: 'Переменная окружения GOOGLE_APPLICATION_CREDENTIALS не установлена' 
      }, { status: 400 });
    }

    // Проверяем существование файла с учетными данными
    const absolutePath = path.isAbsolute(credentialsPath) 
      ? credentialsPath 
      : path.join(process.cwd(), credentialsPath);
    
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ 
        success: false, 
        error: `Файл учетных данных не найден по пути: ${absolutePath}` 
      }, { status: 400 });
    }

    // Проверяем валидность JSON файла
    try {
      const fileContent = fs.readFileSync(absolutePath, 'utf8');
      JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Файл учетных данных содержит невалидный JSON' 
      }, { status: 400 });
    }

    // Пытаемся создать клиент Google Cloud Vision API
    try {
      const client = new ImageAnnotatorClient();
      
      // Проверяем соединение путем вызова простого API-метода
      await client.documentTextDetection('https://storage.googleapis.com/cloud-samples-data/vision/ocr/sign.jpg');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Google Cloud Vision API настроен корректно' 
      });
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ 
          success: false, 
          error: `Ошибка при подключении к Google Cloud Vision API: ${error.message}` 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Неизвестная ошибка при подключении к Google Cloud Vision API' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Ошибка при проверке учетных данных Google Cloud:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Произошла внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}