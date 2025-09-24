import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createMockService } from '@/lib/mock-service';

// Интерфейс для распознанных данных счета
export interface InvoiceData {
  invoiceNumber?: string;
  date?: string;
  total?: string;
  vendor?: string;
  items?: Array<{
    description?: string;
    quantity?: number;
    price?: number;
    amount?: number;
  }>;
  rawText: string; // Полный распознанный текст
}

// Интерфейс сервиса распознавания счетов
export interface InvoiceRecognitionService {
  recognizeInvoice: (fileBuffer: Buffer) => Promise<InvoiceData>;
}

// Реальная реализация с использованием Google Cloud Vision API
export class GoogleVisionInvoiceService implements InvoiceRecognitionService {
  private client: ImageAnnotatorClient;

  constructor(keyFilename?: string) {
    // При развертывании на production нужно будет использовать реальные учетные данные
    // Для локальной разработки можно использовать keyFilename или переменную окружения GOOGLE_APPLICATION_CREDENTIALS
    this.client = new ImageAnnotatorClient({
      keyFilename,
    });
  }

  async recognizeInvoice(fileBuffer: Buffer): Promise<InvoiceData> {
    try {
      // Распознавание текста с изображения
      const [result] = await this.client.textDetection(fileBuffer);
      const fullText = result.fullTextAnnotation?.text || '';

      // Простой парсинг распознанного текста для извлечения данных счета
      // Это базовая реализация, которую можно улучшить с использованием регулярных выражений
      // или других методов для более точного извлечения данных
      const invoiceData: InvoiceData = {
        rawText: fullText,
      };

      // Поиск номера счета (обычно после слов "счет", "счет-фактура", "счет №" и т.д.)
      const invoiceNumberRegex = /(?:счет(?:-фактура)?|инвойс|invoice)[№#:\s]+([a-zA-Z0-9\-\/]+)/i;
      const invoiceNumberMatch = fullText.match(invoiceNumberRegex);
      if (invoiceNumberMatch && invoiceNumberMatch[1]) {
        invoiceData.invoiceNumber = invoiceNumberMatch[1].trim();
      }

      // Поиск даты (различные форматы дат)
      const dateRegex = /(?:от|дата|date)[:\s]+(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}|\d{1,2}\s+[а-яА-Я]+\s+\d{4})/i;
      const dateMatch = fullText.match(dateRegex);
      if (dateMatch && dateMatch[1]) {
        invoiceData.date = dateMatch[1].trim();
      }

      // Поиск суммы (обычно после слов "итого", "всего", "сумма" и т.д.)
      const totalRegex = /(?:итого|всего|сумма|total)[:\s]+(\d+[\s\d]*[.,]\d+|\d+[\s\d]*)[₽\s]*руб/i;
      const totalMatch = fullText.match(totalRegex);
      if (totalMatch && totalMatch[1]) {
        invoiceData.total = totalMatch[1].replace(/\s/g, '').trim();
      }

      // Поиск названия поставщика (обычно после слов "поставщик", "продавец" и т.д.)
      const vendorRegex = /(?:поставщик|продавец|исполнитель|организация)[:\s]+([^\n]+)/i;
      const vendorMatch = fullText.match(vendorRegex);
      if (vendorMatch && vendorMatch[1]) {
        invoiceData.vendor = vendorMatch[1].trim();
      }

      // В будущем можно добавить более сложный парсинг для извлечения списка товаров

      return invoiceData;
    } catch (error) {
      console.error('Ошибка при распознавании счета:', error);
      throw new Error('Не удалось распознать счет');
    }
  }
}

// Мок-реализация для разработки и тестирования
export const mockInvoiceRecognitionService: InvoiceRecognitionService = {
  recognizeInvoice: async (fileBuffer: Buffer) => {
    // Имитация задержки API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Возврат фиктивных данных
    return {
      invoiceNumber: 'ИН-12345',
      date: '15.05.2023',
      total: '45600.00',
      vendor: 'ООО "Стекло и Компания"',
      items: [
        {
          description: 'Стеклопакет 1500x1500 мм',
          quantity: 2,
          price: 12000,
          amount: 24000
        },
        {
          description: 'Установка стеклопакета',
          quantity: 2,
          price: 8000,
          amount: 16000
        },
        {
          description: 'Доставка',
          quantity: 1,
          price: 5600,
          amount: 5600
        }
      ],
      rawText: `Счет-фактура № ИН-12345 от 15.05.2023
Поставщик: ООО "Стекло и Компания"
ИНН: 7712345678
КПП: 771201001

Товары/услуги:
1. Стеклопакет 1500x1500 мм - 2 шт. x 12000.00 руб. = 24000.00 руб.
2. Установка стеклопакета - 2 шт. x 8000.00 руб. = 16000.00 руб.
3. Доставка - 1 шт. x 5600.00 руб. = 5600.00 руб.

Итого: 45600.00 руб.
НДС (20%): 7600.00 руб.
Всего к оплате: 45600.00 руб.`
    };
  }
};

// Создание комбинированного сервиса с резервным вариантом
export const createInvoiceRecognitionService = createMockService<InvoiceRecognitionService>(
  // Условие для использования реальной реализации
  () => process.env.NEXT_PUBLIC_USE_REAL_INVOICE_RECOGNITION === 'true' && 
         process.env.GOOGLE_APPLICATION_CREDENTIALS !== undefined,
  
  // Реальная реализация
  () => new GoogleVisionInvoiceService(),
  
  // Мок-реализация
  mockInvoiceRecognitionService
);

// Экспорт экземпляра сервиса для использования в приложении
export const invoiceRecognitionService = createInvoiceRecognitionService();