import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';

import { GoogleAuth } from 'google-auth-library';import { GoogleAuth } from 'google-auth-library';

import { ImageAnnotatorClient } from '@google-cloud/vision';import { ImageAnnotatorClient } from '@google-cloud/vision';

import { enhanceImageForOCR, binarizeImage, enhanceInvoiceImage, enhanceTableImage } from '@/lib/image-processing';import { enhanceImageForOCR, binarizeImage, enhanceInvoiceImage, enhanceTableImage } from     }

import { convertPdfToImage } from '@/lib/pdf-processing';  } catch (error: any) {

    console.error('Глобальная ошибка в API распознавания счетов:', error);

// Create client for Google Cloud Vision API    return NextResponse.json(

let visionClient: ImageAnnotatorClient | null = null;      { 

        error: 'Внутренняя ошибка сервера', 

try {        details: error.message || 'Неизвестная ошибка',

  // Initialize client with credentials from environment variables        suggestions: [

  const auth = new GoogleAuth({          'Попробуйте повторить запрос позже',

    credentials: {          'Убедитесь, что файл не поврежден',

      client_email: process.env.GOOGLE_CLIENT_EMAIL,          'Попробуйте файл меньшего размера или другого формата'

      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),        ]

    },      },

    scopes: ['https://www.googleapis.com/auth/cloud-platform'],      { status: 500, headers: { 'Content-Type': 'application/json' } }

  });    );

  }

  visionClient = new ImageAnnotatorClient({ auth });}

} catch (error) {

  console.error('Error initializing Google Vision API client:', error);/**

} * Извлекает структурированные данные из распознанного текста счета

 * @param fullText Полный текст документа

export async function POST(request: NextRequest) { * @param textElements Отдельные элементы текста с координатами

  try { * @returns Объект с данными счета

    // Check if client is initialized */

    if (!visionClient) {function extractInvoiceData(

      console.error('Google Vision API client not initialized');  fullText: string, 

      return NextResponse.json(  textElements: Array<{text: string, confidence: number, boundingBox: any[]}>

        { error: 'Ошибка конфигурации Google Vision API' },) {

        { status: 500, headers: { 'Content-Type': 'application/json' } }  // Инициализация объекта с данными счета

      );  const data: {

    }    invoiceNumber?: string;

    invoiceDate?: string;

    // Check request type    dueDate?: string;

    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {    totalAmount?: string;

      return NextResponse.json(    totalAmountWithVAT?: string;

        {     vatAmount?: string;

          error: 'Неверный формат запроса. Ожидается multipart/form-data',    supplier?: {

          suggestions: ['Проверьте правильность отправки формы']      name?: string;

        },      inn?: string;

        { status: 400, headers: { 'Content-Type': 'application/json' } }      kpp?: string;

      );      address?: string;

    }    };

    customer?: {

    // Get form from request      name?: string;

    const formData = await request.formData();      inn?: string;

    const file = formData.get('file') as File | null;      address?: string;

    };

    if (!file) {    paymentInfo?: {

      return NextResponse.json(      bankName?: string;

        { error: 'Файл не найден в запросе' },      bankAccount?: string;

        { status: 400, headers: { 'Content-Type': 'application/json' } }      correspondentAccount?: string;

      );      bic?: string;

    }    };

    items?: Array<{

    // Get file extension      name?: string;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();      quantity?: string;

          unit?: string;

    // Get file data as ArrayBuffer      price?: string;

    const fileBuffer = Buffer.from(await file.arrayBuffer());      amount?: string;

        }>;

    // Variable to store image buffer (for PDF or image)  } = {

    let imageBuffer: Buffer = fileBuffer; // Default to the original buffer    supplier: {},

        customer: {},

    // Process file based on extension    paymentInfo: {},

    if (fileExtension === 'pdf') {    items: []

      try {  };

        // Convert PDF to image  

        try {  // Поиск номера счета

          const convertedBuffer = await convertPdfToImage(fileBuffer);  const invoiceNumberRegex = /(?:счет|счёт|счета|invoice|№|номер)[^0-9]*([0-9\/-]+)/i;

          if (convertedBuffer) {  const invoiceNumberMatch = fullText.match(invoiceNumberRegex);

            imageBuffer = convertedBuffer;  if (invoiceNumberMatch && invoiceNumberMatch[1]) {

          } else {    data.invoiceNumber = invoiceNumberMatch[1].trim();

            throw new Error('Не удалось конвертировать PDF в изображение');  }

          }  

        } catch (conversionError: any) {  // Поиск даты счета

          console.error('Ошибка при конвертации PDF в изображение:', conversionError);  const dateRegex = /(?:от|date)[^0-9]*(\d{1,2}[.,-\/]\d{1,2}[.,-\/]\d{2,4}|\d{1,2}\s+[а-яА-Яa-zA-Z]+\s+\d{4})/i;

          return NextResponse.json(  const dateMatch = fullText.match(dateRegex);

            {   if (dateMatch && dateMatch[1]) {

              error: 'Ошибка при обработке PDF документа',     data.invoiceDate = dateMatch[1].trim();

              details: conversionError.message || 'Неизвестная ошибка',  }

              suggestions: [  

                'Попробуйте изображение лучшего качества',  // Поиск суммы

                'Убедитесь, что PDF документ не поврежден',  const totalAmountRegex = /(?:итого|всего|total|сумма|sum)[^0-9]*(\d[\d\s,.]*\d)/i;

                'Попробуйте загрузить документ в другом формате (JPG, PNG)'  const totalAmountMatch = fullText.match(totalAmountRegex);

              ]  if (totalAmountMatch && totalAmountMatch[1]) {

            },    data.totalAmount = totalAmountMatch[1].trim().replace(/\s/g, '');

            { status: 500, headers: { 'Content-Type': 'application/json' } }  }

          );  

        }  // Поиск НДС

      } catch (pdfError) {  const vatRegex = /(?:ндс|vat)[^0-9]*(\d[\d\s,.]*\d)/i;

        console.error('Общая ошибка при обработке PDF:', pdfError);  const vatMatch = fullText.match(vatRegex);

        return NextResponse.json(  if (vatMatch && vatMatch[1]) {

          {     data.vatAmount = vatMatch[1].trim().replace(/\s/g, '');

            error: 'Ошибка при обработке PDF документа',  }

            suggestions: [  

              'Попробуйте изображение лучшего качества',  // Поиск ИНН поставщика

              'Убедитесь, что PDF документ не поврежден',  const supplierInnRegex = /(?:инн|inn)[^0-9]*(\d{10,12})/i;

              'Попробуйте загрузить документ в другом формате (JPG, PNG)'  const supplierInnMatch = fullText.match(supplierInnRegex);

            ]  if (supplierInnMatch && supplierInnMatch[1]) {

          },    data.supplier!.inn = supplierInnMatch[1].trim();

          { status: 500, headers: { 'Content-Type': 'application/json' } }  }

        );  

      }  // Поиск КПП поставщика

    } else if (!['jpg', 'jpeg', 'png', 'webp', 'tiff'].includes(fileExtension || '')) {  const supplierKppRegex = /(?:кпп|kpp)[^0-9]*(\d{9})/i;

      return NextResponse.json(  const supplierKppMatch = fullText.match(supplierKppRegex);

        {   if (supplierKppMatch && supplierKppMatch[1]) {

          error: 'Неподдерживаемый формат файла. Поддерживаются только PDF и изображения (JPG, PNG, WEBP, TIFF)',    data.supplier!.kpp = supplierKppMatch[1].trim();

          suggestions: [  }

            'Сохраните документ в одном из поддерживаемых форматов',  

            'Используйте инструменты конвертации файлов для получения совместимого формата'  // Поиск наименования поставщика (предположим, что оно рядом с ИНН)

          ]  if (supplierInnMatch) {

        },    // Ищем текст выше ИНН, который может быть названием компании

        { status: 400, headers: { 'Content-Type': 'application/json' } }    const innPosition = fullText.indexOf(supplierInnMatch[0]);

      );    const textBeforeInn = fullText.substring(Math.max(0, innPosition - 100), innPosition);

    }    

    // Часто название компании начинается с ООО, АО, ИП и т.д.

    // Enhance image quality for OCR with specific invoice processing    const companyNameRegex = /(ООО|АО|ПАО|ИП|ЗАО)[\s«"]([^»"\n]+)/i;

    try {    const companyNameMatch = textBeforeInn.match(companyNameRegex);

      // Так как это API для распознавания счетов, используем специальную функцию    if (companyNameMatch) {

      let enhancedBuffer = await enhanceInvoiceImage(imageBuffer);       data.supplier!.name = `${companyNameMatch[1]} "${companyNameMatch[2]}"`.trim();

      if (enhancedBuffer) {    }

        imageBuffer = enhancedBuffer;  }

        console.log('Изображение улучшено для распознавания счетов');  

      }  // Получение элементов таблицы, если они есть

    } catch (enhanceError) {  // Это упрощенный подход - реальный парсинг таблиц гораздо сложнее

      console.error('Ошибка при улучшении изображения:', enhanceError);  const tableRowRegex = /(\d+)[^\d]+(\d+(?:[.,]\d+)?)[^\d]+(\d+(?:[.,]\d+)?)[^\d]+(\d+(?:[.,]\d+)?)/g;

      // Продолжаем с оригинальным изображением, если улучшение не удалось  let match;

    }  while ((match = tableRowRegex.exec(fullText)) !== null) {

    const item = {

    // Выполняем распознавание текста с помощью Google Cloud Vision API      quantity: match[1].trim(),

    try {      unit: 'шт', // Предполагаем единицу измерения

      // Для счетов используем document-text-detection, более точный для структурированных документов      price: match[2].trim(),

      const [result] = await visionClient.documentTextDetection({      amount: match[4].trim()

        image: { content: imageBuffer },    };

        imageContext: {    

          languageHints: ['ru-RU', 'en-US'], // Указываем языки для повышения точности    // Пытаемся найти название товара/услуги

        },    const startPos = Math.max(0, match.index - 100);

      });    const endPos = match.index;

    const textBeforeRow = fullText.substring(startPos, endPos);

      // Извлекаем полный текст и структуру документа    const lastLineBreak = textBeforeRow.lastIndexOf('\n');

      let fullText = '';    if (lastLineBreak !== -1) {

      let textElements: Array<{text: string, confidence: number, boundingBox: any[]}> = [];      item.name = textBeforeRow.substring(lastLineBreak + 1).trim();

          }

      if (result.fullTextAnnotation) {    

        // Если используем documentTextDetection, то извлекаем текст из fullTextAnnotation    data.items!.push(item);

        fullText = result.fullTextAnnotation.text || '';  }

          

        // Извлекаем структурированные блоки текста (страницы, параграфы, блоки, слова)  return data;

        const pages = result.fullTextAnnotation.pages || [];}essing';

        import { convertPdfToImage } from '@/lib/pdf-processing';

        // Собираем структурированные элементы текста для более точного анализа

        textElements = pages.flatMap(page => // Create client for Google Cloud Vision API

          (page.blocks || []).flatMap(block => let visionClient: ImageAnnotatorClient | null = null;

            (block.paragraphs || []).flatMap(paragraph => 

              (paragraph.words || []).map(word => ({try {

                text: (word.symbols || []).map(symbol => symbol.text).join(''),  // Initialize client with credentials from environment variables

                confidence: word.confidence || 0,  const auth = new GoogleAuth({

                boundingBox: word.boundingBox?.vertices || [],    credentials: {

              }))      client_email: process.env.GOOGLE_CLIENT_EMAIL,

            )      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),

          )    },

        );    scopes: ['https://www.googleapis.com/auth/cloud-platform'],

      } else if (result.textAnnotations && result.textAnnotations.length > 0) {  });

        // Если используем textDetection, обрабатываем как раньше

        fullText = result.textAnnotations[0].description || '';  visionClient = new ImageAnnotatorClient({ auth });

        } catch (error) {

        // Извлекаем отдельные слова и строки  console.error('Error initializing Google Vision API client:', error);

        textElements = result.textAnnotations.slice(1).map(item => ({}

          text: item.description || '',

          confidence: item.confidence || 0,export async function POST(request: NextRequest) {

          boundingBox: item.boundingPoly?.vertices || [],  try {

        }));    // Check if client is initialized

      }    if (!visionClient) {

            console.error('Google Vision API client not initialized');

      if (!fullText && textElements.length === 0) {      return NextResponse.json(

        // Если первичное распознавание не дало результатов, попробуем альтернативный метод обработки        { error: 'Google Vision API configuration error' },

        console.log('Первичное распознавание не дало результатов, пробуем альтернативные методы...');        { status: 500, headers: { 'Content-Type': 'application/json' } }

        try {      );

          // Применим бинаризацию и повторим распознавание    }

          const binarizedImage = await binarizeImage(imageBuffer);

          const [secondResult] = await visionClient.textDetection({    // Check request type

            image: { content: binarizedImage },    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {

            imageContext: {      return NextResponse.json(

              languageHints: ['ru-RU', 'en-US'],        { error: 'Invalid request format. Expected multipart/form-data' },

            },        { status: 400, headers: { 'Content-Type': 'application/json' } }

          });      );

              }

          const secondDetections = secondResult.textAnnotations || [];

          if (secondDetections.length > 0) {    // Get form from request

            console.log('Альтернативный метод обработки дал результаты');    const formData = await request.formData();

            fullText = secondDetections[0].description || '';    const file = formData.get('file') as File | null;

            textElements = secondDetections.slice(1).map(item => ({

              text: item.description || '',    if (!file) {

              confidence: item.confidence || 0,      return NextResponse.json(

              boundingBox: item.boundingPoly?.vertices || [],        { error: 'File not found in request' },

            }));        { status: 400, headers: { 'Content-Type': 'application/json' } }

          } else {      );

            return NextResponse.json(    }

              { 

                error: 'Текст на изображении не обнаружен',    // Get file extension

                suggestions: [    const fileExtension = file.name.split('.').pop()?.toLowerCase();

                  'Попробуйте изображение с лучшим разрешением',    

                  'Убедитесь, что текст хорошо виден на изображении',    // Get file data as ArrayBuffer

                  'Попробуйте изменить угол или освещение при съемке документа',    const fileBuffer = Buffer.from(await file.arrayBuffer());

                  'Если это скан - увеличьте контрастность при сканировании'    

                ]    // Variable to store image buffer (for PDF or image)

              },    let imageBuffer: Buffer = fileBuffer; // Default to the original buffer

              { status: 404, headers: { 'Content-Type': 'application/json' } }    

            );    // Process file based on extension

          }    if (fileExtension === 'pdf') {

        } catch (altError) {      try {

          console.error('Ошибка при альтернативной обработке:', altError);        // Convert PDF to image

          return NextResponse.json(        try {

            {           const convertedBuffer = await convertPdfToImage(fileBuffer);

              error: 'Текст на изображении не обнаружен',          if (convertedBuffer) {

              suggestions: [            imageBuffer = convertedBuffer;

                'Попробуйте изображение с лучшим разрешением',          } else {

                'Убедитесь, что текст хорошо виден на изображении',            throw new Error('Не удалось конвертировать PDF в изображение');

                'Попробуйте изменить угол или освещение при съемке документа'          }

              ]        } catch (conversionError: any) {

            },          console.error('Ошибка при конвертации PDF в изображение:', conversionError);

            { status: 404, headers: { 'Content-Type': 'application/json' } }          return NextResponse.json(

          );            { 

        }              error: 'Ошибка при обработке PDF документа', 

      }              details: conversionError.message || 'Неизвестная ошибка',

              suggestions: [

      // Извлечение структурированных данных счета                'Попробуйте изображение лучшего качества',

      const invoiceData = extractInvoiceData(fullText, textElements);                'Убедитесь, что PDF документ не поврежден',

                      'Попробуйте загрузить документ в другом формате (JPG, PNG)'

      // Return results in JSON format              ]

      return NextResponse.json(            },

        {             { status: 500, headers: { 'Content-Type': 'application/json' } }

          success: true,          );

          fullText,        }

          textElements,      } catch (pdfError) {

          invoiceData,        console.error('Общая ошибка при обработке PDF:', pdfError);

          // Add additional information for debugging        return NextResponse.json(

          fileType: fileExtension,          { 

          enhancedImage: true,            error: 'Ошибка при обработке PDF документа',

        },            suggestions: [

        { status: 200, headers: { 'Content-Type': 'application/json' } }              'Попробуйте изображение лучшего качества',

      );              'Убедитесь, что PDF документ не поврежден',

    } catch (recognitionError: any) {              'Попробуйте загрузить документ в другом формате (JPG, PNG)'

      console.error('Ошибка при распознавании текста:', recognitionError);            ]

      return NextResponse.json(          },

        {           { status: 500, headers: { 'Content-Type': 'application/json' } }

          error: 'Ошибка при распознавании текста',         );

          details: recognitionError.message || 'Неизвестная ошибка',      }

          suggestions: [    } else if (!['jpg', 'jpeg', 'png', 'webp', 'tiff'].includes(fileExtension || '')) {

            'Попробуйте изображение лучшего качества',      return NextResponse.json(

            'Убедитесь, что текст контрастный и хорошо виден',        { 

            'Если документ содержит перевернутый или повернутый текст, исправьте ориентацию'          error: 'Неподдерживаемый формат файла. Поддерживаются только PDF и изображения (JPG, PNG, WEBP, TIFF)',

          ]          suggestions: [

        },            'Сохраните документ в одном из поддерживаемых форматов',

        { status: 500, headers: { 'Content-Type': 'application/json' } }            'Используйте инструменты конвертации файлов для получения совместимого формата'

      );          ]

    }        },

  } catch (error: any) {        { status: 400, headers: { 'Content-Type': 'application/json' } }

    console.error('Глобальная ошибка в API распознавания счетов:', error);      );

    return NextResponse.json(    }

      { 

        error: 'Внутренняя ошибка сервера',     // Enhance image quality for OCR with specific invoice processing

        details: error.message || 'Неизвестная ошибка',    try {

        suggestions: [      // Так как это API для распознавания счетов, используем специальную функцию enhanceInvoiceImage

          'Попробуйте повторить запрос позже',      let enhancedBuffer = await enhanceImageForOCR(imageBuffer); // Используем автоопределение типа документа

          'Убедитесь, что файл не поврежден',      if (enhancedBuffer) {

          'Попробуйте файл меньшего размера или другого формата'        imageBuffer = enhancedBuffer;

        ]        console.log('Изображение улучшено для распознавания');

      },      }

      { status: 500, headers: { 'Content-Type': 'application/json' } }    } catch (enhanceError) {

    );      console.error('Ошибка при улучшении изображения:', enhanceError);

  }      // Продолжаем с оригинальным изображением, если улучшение не удалось

}    }



/**    // Выполняем распознавание текста с помощью Google Cloud Vision API

 * Извлекает структурированные данные из распознанного текста счета    try {

 * @param fullText Полный текст документа      // Для счетов используем document-text-detection, более точный для структурированных документов

 * @param textElements Отдельные элементы текста с координатами      const [result] = await visionClient.documentTextDetection({

 * @returns Объект с данными счета        image: { content: imageBuffer },

 */        imageContext: {

function extractInvoiceData(          languageHints: ['ru-RU', 'en-US'], // Указываем языки для повышения точности

  fullText: string,         },

  textElements: Array<{text: string, confidence: number, boundingBox: any[]}>      });

) {

  // Инициализация объекта с данными счета      const detections = result.fullTextAnnotation ? 

  const data: {        [{ description: result.fullTextAnnotation.text }] : (result.textAnnotations || []);

    invoiceNumber?: string;      

    invoiceDate?: string;      if (detections.length === 0) {

    dueDate?: string;        // Если первичное распознавание не дало результатов, попробуем альтернативный метод обработки

    totalAmount?: string;        console.log('Первичное распознавание не дало результатов, пробуем альтернативные методы...');

    totalAmountWithVAT?: string;        try {

    vatAmount?: string;          // Применим бинаризацию и повторим распознавание

    supplier?: {          const binarizedImage = await binarizeImage(imageBuffer);

      name?: string;          const [secondResult] = await visionClient.textDetection({

      inn?: string;            image: { content: binarizedImage },

      kpp?: string;            imageContext: {

      address?: string;              languageHints: ['ru-RU', 'en-US'],

    };            },

    customer?: {          });

      name?: string;          

      inn?: string;          const secondDetections = secondResult.textAnnotations || [];

      address?: string;          if (secondDetections.length > 0) {

    };            console.log('Альтернативный метод обработки дал результаты');

    paymentInfo?: {            return NextResponse.json(

      bankName?: string;              { 

      bankAccount?: string;                success: true,

      correspondentAccount?: string;                fullText: secondDetections[0].description || '',

      bic?: string;                textElements: secondDetections.slice(1).map(item => ({

    };                  text: item.description || '',

    items?: Array<{                  confidence: item.confidence || 0,

      name?: string;                  boundingBox: item.boundingPoly?.vertices || [],

      quantity?: string;                })),

      unit?: string;                fileType: fileExtension,

      price?: string;                enhancedImage: true,

      amount?: string;                processingMethod: 'alternative'

    }>;              },

  } = {              { status: 200, headers: { 'Content-Type': 'application/json' } }

    supplier: {},            );

    customer: {},          }

    paymentInfo: {},        } catch (altError) {

    items: []          console.error('Ошибка при альтернативной обработке:', altError);

  };        }

          

  // Поиск номера счета        // Если все методы не дали результатов

  const invoiceNumberRegex = /(?:счет|счёт|счета|invoice|№|номер)[^0-9]*([0-9\/-]+)/i;        return NextResponse.json(

  const invoiceNumberMatch = fullText.match(invoiceNumberRegex);          { 

  if (invoiceNumberMatch && invoiceNumberMatch[1]) {            error: 'Текст на изображении не обнаружен',

    data.invoiceNumber = invoiceNumberMatch[1].trim();            suggestions: [

  }              'Попробуйте изображение с лучшим разрешением',

                'Убедитесь, что текст хорошо виден на изображении',

  // Поиск даты счета              'Попробуйте изменить угол или освещение при съемке документа',

  const dateRegex = /(?:от|date)[^0-9]*(\d{1,2}[.,-\/]\d{1,2}[.,-\/]\d{2,4}|\d{1,2}\s+[а-яА-Яa-zA-Z]+\s+\d{4})/i;              'Если это скан - увеличьте контрастность при сканировании'

  const dateMatch = fullText.match(dateRegex);            ]

  if (dateMatch && dateMatch[1]) {          },

    data.invoiceDate = dateMatch[1].trim();          { status: 404, headers: { 'Content-Type': 'application/json' } }

  }        );

        }

  // Поиск суммы

  const totalAmountRegex = /(?:итого|всего|total|сумма|sum)[^0-9]*(\d[\d\s,.]*\d)/i;      // Извлекаем полный текст и структуру документа

  const totalAmountMatch = fullText.match(totalAmountRegex);      let fullText = '';

  if (totalAmountMatch && totalAmountMatch[1]) {      let textElements: Array<{text: string, confidence: number, boundingBox: any[]}> = [];

    data.totalAmount = totalAmountMatch[1].trim().replace(/\s/g, '');      

  }      if (result.fullTextAnnotation) {

          // Если используем documentTextDetection, то извлекаем текст из fullTextAnnotation

  // Поиск НДС        fullText = result.fullTextAnnotation.text || '';

  const vatRegex = /(?:ндс|vat)[^0-9]*(\d[\d\s,.]*\d)/i;        

  const vatMatch = fullText.match(vatRegex);        // Извлекаем структурированные блоки текста (страницы, параграфы, блоки, слова)

  if (vatMatch && vatMatch[1]) {        const pages = result.fullTextAnnotation.pages || [];

    data.vatAmount = vatMatch[1].trim().replace(/\s/g, '');        

  }        // Собираем структурированные элементы текста для более точного анализа

          textElements = pages.flatMap(page => 

  // Поиск ИНН поставщика          (page.blocks || []).flatMap(block => 

  const supplierInnRegex = /(?:инн|inn)[^0-9]*(\d{10,12})/i;            (block.paragraphs || []).flatMap(paragraph => 

  const supplierInnMatch = fullText.match(supplierInnRegex);              (paragraph.words || []).map(word => ({

  if (supplierInnMatch && supplierInnMatch[1]) {                text: (word.symbols || []).map(symbol => symbol.text).join(''),

    data.supplier!.inn = supplierInnMatch[1].trim();                confidence: word.confidence || 0,

  }                boundingBox: word.boundingBox?.vertices || [],

                }))

  // Поиск КПП поставщика            )

  const supplierKppRegex = /(?:кпп|kpp)[^0-9]*(\d{9})/i;          )

  const supplierKppMatch = fullText.match(supplierKppRegex);        );

  if (supplierKppMatch && supplierKppMatch[1]) {      } else if (detections.length > 0) {

    data.supplier!.kpp = supplierKppMatch[1].trim();        // Если используем textDetection, обрабатываем как раньше

  }        fullText = detections[0].description || '';

          

  // Поиск наименования поставщика (предположим, что оно рядом с ИНН)        // Извлекаем отдельные слова и строки

  if (supplierInnMatch) {        textElements = detections.slice(1).map(item => ({

    // Ищем текст выше ИНН, который может быть названием компании          text: item.description || '',

    const innPosition = fullText.indexOf(supplierInnMatch[0]);          confidence: item.confidence || 0,

    const textBeforeInn = fullText.substring(Math.max(0, innPosition - 100), innPosition);          boundingBox: item.boundingPoly?.vertices || [],

            }));

    // Часто название компании начинается с ООО, АО, ИП и т.д.      }

    const companyNameRegex = /(ООО|АО|ПАО|ИП|ЗАО)[\s«"]([^»"\n]+)/i;

    const companyNameMatch = textBeforeInn.match(companyNameRegex);      // Извлечение структурированных данных счета

    if (companyNameMatch) {      const invoiceData = extractInvoiceData(fullText, textElements);

      data.supplier!.name = `${companyNameMatch[1]} "${companyNameMatch[2]}"`.trim();      

    }      // Return results in JSON format

  }      return NextResponse.json(

          { 

  // Получение элементов таблицы, если они есть          success: true,

  // Это упрощенный подход - реальный парсинг таблиц гораздо сложнее          fullText,

  const tableRowRegex = /(\d+)[^\d]+(\d+(?:[.,]\d+)?)[^\d]+(\d+(?:[.,]\d+)?)[^\d]+(\d+(?:[.,]\d+)?)/g;          textElements,

  let match;          invoiceData,

  while ((match = tableRowRegex.exec(fullText)) !== null) {          // Add additional information for debugging

    const item: {          fileType: fileExtension,

      name?: string;          enhancedImage: true,

      quantity: string;        },

      unit: string;        { status: 200, headers: { 'Content-Type': 'application/json' } }

      price: string;      );

      amount: string;    } catch (recognitionError: any) {

    } = {      console.error('Error recognizing text:', recognitionError);

      quantity: match[1].trim(),      return NextResponse.json(

      unit: 'шт', // Предполагаем единицу измерения        { 

      price: match[2].trim(),          error: 'Ошибка при распознавании текста', 

      amount: match[4].trim()          details: recognitionError.message || 'Неизвестная ошибка',

    };          suggestions: [

                'Попробуйте изображение лучшего качества',

    // Пытаемся найти название товара/услуги            'Убедитесь, что текст контрастный и хорошо виден',

    const startPos = Math.max(0, match.index - 100);            'Если документ содержит перевернутый или повернутый текст, исправьте ориентацию'

    const endPos = match.index;          ]

    const textBeforeRow = fullText.substring(startPos, endPos);        },

    const lastLineBreak = textBeforeRow.lastIndexOf('\n');        { status: 500, headers: { 'Content-Type': 'application/json' } }

    if (lastLineBreak !== -1) {      );

      item.name = textBeforeRow.substring(lastLineBreak + 1).trim();    }

    }  } catch (error: any) {

        console.error('Global error in invoice recognition API:', error);

    data.items!.push(item);    return NextResponse.json(

  }      { 

          error: 'Внутренняя ошибка сервера', 

  return data;        details: error.message || 'Неизвестная ошибка',

}        suggestions: [
          'Попробуйте повторить запрос позже',
          'Убедитесь, что файл не поврежден',
          'Попробуйте файл меньшего размера или другого формата'
        ]
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}