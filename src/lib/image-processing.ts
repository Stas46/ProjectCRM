/**
 * Утилиты для предварительной обработки изображений перед отправкой в OCR API
 * Эти функции помогают улучшить качество распознавания текста
 */

import sharp from 'sharp';

/**
 * Улучшает качество изображения для OCR
 * @param buffer Буфер изображения
 * @returns Буфер улучшенного изображения
 */
export async function enhanceImageForOCR(buffer: Buffer): Promise<Buffer> {
  try {
    // Автоматически определяем, что перед нами - счет, таблица или другой тип документа
    const documentType = await detectDocumentType(buffer);
    console.log(`Определен тип документа: ${documentType}`);
    
    // В зависимости от типа документа применяем разные стратегии улучшения
    switch (documentType) {
      case 'invoice':
        return await enhanceInvoiceImage(buffer);
      case 'table':
        return await enhanceTableImage(buffer);
      case 'text':
      default:
        // Используем базовое улучшение для обычного текста
        const enhancedImage = await sharp(buffer)
          // Преобразуем в градации серого для лучшего распознавания текста
          .greyscale()
          // Увеличиваем контраст для лучшего выделения текста
          .normalise()
          // Устраняем шум для более четкого текста
          .median(1)
          // Получаем буфер обработанного изображения
          .toBuffer();
        
        return enhancedImage;
    }
  } catch (error) {
    console.error('Ошибка при улучшении изображения:', error);
    // В случае ошибки возвращаем исходное изображение
    return buffer;
  }
}

/**
 * Определяет тип документа на изображении
 * @param buffer Буфер изображения
 * @returns Строка с типом документа: 'invoice', 'table' или 'text'
 */
async function detectDocumentType(buffer: Buffer): Promise<'invoice' | 'table' | 'text'> {
  try {
    // Получаем метаданные изображения
    const metadata = await sharp(buffer).metadata();
    
    // Получаем изображение в градациях серого для анализа
    const grayImage = await sharp(buffer)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { data, info } = grayImage;
    const { width, height } = info;
    
    // Определяем наличие линий (возможная таблица или форма)
    let horizontalLines = 0;
    let verticalLines = 0;
    
    // Упрощенный алгоритм обнаружения горизонтальных линий
    // (в реальном приложении тут был бы более сложный алгоритм)
    for (let y = 0; y < height; y += height / 20) {
      const row = Math.floor(y);
      let consecutiveBlackPixels = 0;
      
      for (let x = 0; x < width; x++) {
        const idx = row * width + x;
        const pixelValue = data[idx];
        
        if (pixelValue < 100) { // тёмный пиксель
          consecutiveBlackPixels++;
          if (consecutiveBlackPixels > width * 0.3) { // если линия достаточно длинная
            horizontalLines++;
            break;
          }
        } else {
          consecutiveBlackPixels = 0;
        }
      }
    }
    
    // Ищем признаки счета по структуре изображения
    const invoiceKeywords = ['счет', 'invoice', 'bill', 'payment', 'оплата', 'квитанция'];
    let hasInvoicePattern = false;
    
    // В счетах часто бывают горизонтальные линии и прямоугольные области
    if (horizontalLines >= 4 && width > height * 0.7) {
      hasInvoicePattern = true;
    }
    
    // Принимаем решение на основе обнаруженных признаков
    if (hasInvoicePattern || horizontalLines >= 5) {
      return 'invoice';
    } else if (horizontalLines >= 3 && verticalLines >= 2) {
      return 'table';
    } else {
      return 'text';
    }
  } catch (error) {
    console.error('Ошибка при определении типа документа:', error);
    return 'text'; // по умолчанию считаем обычным текстом
  }
}

/**
 * Выполняет бинаризацию изображения (превращает в черно-белое)
 * Это может помочь в случаях, когда текст имеет низкий контраст
 * @param buffer Буфер изображения
 * @returns Буфер бинаризованного изображения
 */
export async function binarizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    const binarizedImage = await sharp(buffer)
      .greyscale()
      // Пороговая бинаризация - все пиксели будут либо черными, либо белыми
      .threshold(128)
      .toBuffer();
    
    return binarizedImage;
  } catch (error) {
    console.error('Ошибка при бинаризации изображения:', error);
    return buffer;
  }
}

/**
 * Автоматически обрезает изображение, удаляя лишние поля
 * Это может помочь сфокусироваться на тексте документа
 * @param buffer Буфер изображения
 * @returns Буфер обрезанного изображения
 */
export async function autoTrimImage(buffer: Buffer): Promise<Buffer> {
  try {
    const trimmedImage = await sharp(buffer)
      // Автоматическое обрезание лишних полей
      .trim()
      .toBuffer();
    
    return trimmedImage;
  } catch (error) {
    console.error('Ошибка при обрезке изображения:', error);
    return buffer;
  }
}

/**
 * Специальное улучшение изображений счетов для OCR
 * Оптимизирует изображение для лучшего распознавания таблиц и структурированного текста
 * @param buffer Буфер изображения
 * @returns Буфер улучшенного изображения
 */
export async function enhanceInvoiceImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Пробуем определить тип изображения
    const metadata = await sharp(buffer).metadata();
    
    // Создаем базовую обработку для счетов
    let processedImage = await sharp(buffer)
      // Преобразуем в градации серого
      .greyscale()
      // Устраняем шум
      .median(1.5)
      // Увеличиваем резкость для лучшей четкости текста
      .sharpen({
        sigma: 1.2,
        m1: 0.5,
        m2: 0.5
      })
      // Увеличиваем контраст между текстом и фоном
      .linear(1.1, -10)
      // Корректируем гамму для лучшей видимости темного текста
      .gamma(1.1);
      
    // Для изображений с низким разрешением, улучшаем четкость
    if (metadata.width && metadata.width < 1200) {
      processedImage = processedImage
        // Увеличиваем размер для лучшего распознавания
        .resize(Math.min(metadata.width * 1.5, 2000), null, {
          fit: 'inside',
          withoutEnlargement: false,
          kernel: 'lanczos3'
        });
    }
    
    return processedImage.toBuffer();
  } catch (error) {
    console.error('Ошибка при улучшении изображения счета:', error);
    return buffer;
  }
}

/**
 * Специальное улучшение для таблиц в документах
 * Оптимизирует изображение для лучшего распознавания табличных данных
 * @param buffer Буфер изображения
 * @returns Буфер улучшенного изображения
 */
export async function enhanceTableImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Создаем специальную обработку для таблиц
    const processedImage = await sharp(buffer)
      // Преобразуем в градации серого
      .greyscale()
      // Увеличиваем контраст для лучшего выделения линий таблицы
      .normalise({ lower: 20, upper: 230 })
      // Улучшаем четкость границ
      .sharpen({ sigma: 1.5 })
      // Устраняем мелкие шумы
      .median(1)
      // Увеличиваем контрастность текста
      .linear(1.2, -15)
      .toBuffer();
    
    return processedImage;
  } catch (error) {
    console.error('Ошибка при улучшении изображения таблицы:', error);
    return buffer;
  }
}

/**
 * Комплексное улучшение изображения для OCR
 * Применяет несколько техник для максимального улучшения распознаваемости текста
 * @param buffer Буфер изображения
 * @returns Буфер улучшенного изображения
 */
export async function completeImageEnhancement(buffer: Buffer): Promise<Buffer> {
  try {
    // Пробуем определить тип изображения
    const metadata = await sharp(buffer).metadata();
    
    // Базовое улучшение для всех изображений
    let processedImage = await sharp(buffer)
      .greyscale()
      .normalise()
      .median(1);
    
    // Для JPG применяем дополнительные улучшения
    if (metadata.format === 'jpeg') {
      processedImage = processedImage
        .sharpen()
        .gamma(1.2);
    }
    
    // Для больших изображений уменьшаем размер, но сохраняем качество
    if (metadata.width && metadata.width > 2000) {
      const newWidth = 2000;
      const ratio = metadata.width / 2000;
      const newHeight = Math.round(metadata.height! / ratio);
      
      processedImage = processedImage.resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    return processedImage.toBuffer();
  } catch (error) {
    console.error('Ошибка при комплексном улучшении изображения:', error);
    return buffer;
  }
}