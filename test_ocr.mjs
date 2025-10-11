import fs from 'fs';
import path from 'path';
import { ImageAnnotatorClient } from '@google-cloud/vision';

async function testOCR() {
  // Инициализация клиента Google Vision
  const vision = new ImageAnnotatorClient({
    keyFilename: path.join(process.cwd(), 'google-credentials.json')
  });

  // Читаем PDF и конвертируем
  const pdfPath = 'temp/1758819496115.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF файл не найден');
    return;
  }

  console.log('Запускаем конвертацию PDF...');
  
  const { execSync } = await import('child_process');
  
  try {
    const pythonResult = execSync(
      `"C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe" scripts/convert_pdf.py "${pdfPath}"`,
      { encoding: 'utf-8', cwd: process.cwd() }
    );
    
    const pdfData = JSON.parse(pythonResult);
    console.log(`PDF конвертирован: ${pdfData.page_count} страниц`);
    
    let fullText = '';
    
    for (const image of pdfData.images) {
      console.log(`\nОбрабатываем страницу ${image.page}...`);
      
      const imageBuffer = Buffer.from(image.base64, 'base64');
      
      // Тестируем разные методы OCR
      console.log('1. Тестируем textDetection...');
      const [textResult] = await vision.textDetection({
        image: { content: imageBuffer },
      });
      
      console.log('2. Тестируем documentTextDetection...');
      const [docResult] = await vision.documentTextDetection({
        image: { content: imageBuffer },
      });
      
      let textFromText = '';
      let textFromDoc = '';
      
      if (textResult.textAnnotations && textResult.textAnnotations.length > 0) {
        textFromText = textResult.textAnnotations[0].description || '';
      }
      
      if (docResult.fullTextAnnotation) {
        textFromDoc = docResult.fullTextAnnotation.text || '';
      } else if (docResult.textAnnotations && docResult.textAnnotations.length > 0) {
        textFromDoc = docResult.textAnnotations[0].description || '';
      }
      
      console.log(`\nРезультат textDetection (${textFromText.length} символов):`);
      console.log(textFromText.substring(0, 500) + '...');
      
      console.log(`\nРезультат documentTextDetection (${textFromDoc.length} символов):`);
      console.log(textFromDoc.substring(0, 500) + '...');
      
      // Используем лучший результат
      const pageText = textFromDoc.length > textFromText.length ? textFromDoc : textFromText;
      fullText += pageText + '\n';
      
      console.log(`\nВыбран текст длиной: ${pageText.length} символов`);
    }
    
    console.log(`\n\n=== ПОЛНЫЙ ИЗВЛЕЧЕННЫЙ ТЕКСТ (${fullText.length} символов) ===`);
    console.log(fullText);
    
    // Сохраним в файл для тестирования
    fs.writeFileSync('extracted_text_debug.txt', fullText, 'utf-8');
    console.log('\nТекст сохранен в extracted_text_debug.txt');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testOCR().catch(console.error);