// Тестирование OCR и парсера на изображении
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const imageFile = 'test-invoices/счет 5146 от 06.11.25.jpg';

async function testImageOCR() {
  console.log('='.repeat(80));
  console.log('ТЕСТИРОВАНИЕ OCR И ПАРСЕРА НА ИЗОБРАЖЕНИИ');
  console.log(`Файл: ${path.basename(imageFile)}`);
  console.log('='.repeat(80));

  try {
    // Инициализируем Google Vision
    const vision = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-credentials.json',
    });

    // Читаем изображение
    const imageBuffer = await fs.readFile(imageFile);
    
    // OCR
    console.log('\n🔍 Запускаем OCR...');
    const [result] = await vision.textDetection(imageBuffer);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      console.log('❌ OCR не смог извлечь текст из изображения');
      return;
    }

    const ocrText = detections[0].description;
    console.log(`✓ OCR извлечено символов: ${ocrText.length}`);
    console.log(`\nПервые 500 символов:\n${ocrText.substring(0, 500)}`);

    // Сохраняем в временный файл
    const tempFile = 'temp/ocr-image-node.txt';
    await fs.mkdir('temp', { recursive: true });
    await fs.writeFile(tempFile, ocrText, 'utf-8');
    console.log(`\n✓ Сохранено в ${tempFile}`);

    // Парсим через Python parser
    console.log('\n📋 Запускаем парсер...');
    
    const pythonExe = 'C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe';
    
    return new Promise((resolve, reject) => {
      const parser = spawn(pythonExe, [
        'ultimate_invoice_parser.py',
        '--file', tempFile,
        '--output-format', 'json'
      ]);

      let stdout = '';
      let stderr = '';

      parser.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      parser.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      parser.on('close', (code) => {
        if (code !== 0) {
          console.log(`❌ Ошибка парсинга (код ${code}):`);
          console.log(stderr);
          reject(new Error(`Parser exited with code ${code}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          
          console.log('\n' + '='.repeat(80));
          console.log('📋 РЕЗУЛЬТАТЫ ПАРСИНГА:');
          console.log('='.repeat(80));
          
          const invoice = parsed.invoice || {};
          const contractor = parsed.contractor || {};
          
          console.log(`   Номер счета: ${invoice.number || 'НЕ НАЙДЕН'}`);
          console.log(`   Дата: ${invoice.date || 'НЕ НАЙДЕНА'}`);
          console.log(`   Поставщик: ${contractor.name || 'НЕ НАЙДЕН'}`);
          console.log(`   ИНН поставщика: ${contractor.inn || 'НЕ НАЙДЕН'}`);
          console.log(`   Сумма: ${invoice.total_amount || 'НЕ НАЙДЕНА'}`);
          console.log(`   НДС: ${invoice.vat_amount || 'НЕ НАЙДЕН'}`);
          console.log(`   Ставка НДС: ${invoice.vat_rate || 'НЕ УКАЗАНА'}`);
          
          // Проверяем критичные поля
          const missing = [];
          if (!invoice.number) missing.push('номер счета');
          if (!contractor.name) missing.push('поставщик');
          if (!invoice.total_amount) missing.push('сумма');
          
          if (missing.length > 0) {
            console.log(`\n⚠️  НЕ РАСПОЗНАНЫ: ${missing.join(', ')}`);
          } else {
            console.log('\n✅ ВСЕ КЛЮЧЕВЫЕ ПОЛЯ РАСПОЗНАНЫ');
          }
          
          resolve(parsed);
        } catch (e) {
          console.log('❌ Ошибка парсинга JSON:', e.message);
          console.log('Первые 500 символов вывода:', stdout.substring(0, 500));
          reject(e);
        }
      });
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    throw error;
  } finally {
    console.log('\n' + '='.repeat(80));
    console.log('ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
    console.log('='.repeat(80));
  }
}

testImageOCR().catch(console.error);
