import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';



export async function POST(request: NextRequest) {

  return NextResponse.json({

    success: true,export async function POST(request: NextRequest) {

    message: 'API очищен от PDF зависимостей',

    status: 'ready'  return NextResponse.json({

  });

}    success: true,export async function POST(request: NextRequest) {import { ImageAnnotatorClient } from '@google-cloud/vision';

    message: 'API для распознавания готов',

    note: 'PDF зависимости удалены, работает только с изображениями'  try {

  });

}    const formData = await request.formData();import { ImageAnnotatorClient } from '@google-cloud/vision';

    const file = formData.get('file') as File;

    let visionClient: ImageAnnotatorClient | null = null;

    if (!file) {

      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });import { GoogleAuth } from 'google-auth-library';

    }

    function getVisionClient() {

    // Пока просто возвращаем успех для тестирования

    return NextResponse.json({  if (!visionClient) {let visionClient: ImageAnnotatorClient | null = null;

      success: true,

      message: 'Файл получен',    try {

      fileName: file.name,

      fileSize: file.size,      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;import { ImageAnnotatorClient } from '@google-cloud/vision';import { GoogleAuth } from 'google-auth-library';

      fileType: file.type

    });      

    

  } catch (error: any) {      if (credentials) {function getVisionClient() {

    return NextResponse.json(

      { error: 'Ошибка сервера', details: error.message },        const credentialsObj = JSON.parse(credentials);

      { status: 500 }

    );        visionClient = new ImageAnnotatorClient({  if (!visionClient) {

  }

}          credentials: credentialsObj,

          projectId: credentialsObj.project_id    try {

        });

      } else {      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;// Create client for Google Cloud Vision APIimport { ImageAnnotatorClient } from '@google-cloud/vision';import { GoogleAuth } from 'google-auth-library';import { GoogleAuth } from 'google-auth-library';

        visionClient = new ImageAnnotatorClient();

      }      

      

      console.log('Google Vision API client initialized');      if (credentials) {let visionClient: ImageAnnotatorClient | null = null;

    } catch (error) {

      console.error('Failed to initialize Google Vision client:', error);        const credentialsObj = JSON.parse(credentials);

      throw new Error('Google Vision API не настроен');

    }        visionClient = new ImageAnnotatorClient({

  }

            credentials: credentialsObj,

  return visionClient;

}          projectId: credentialsObj.project_id// Initialize Google Vision client



export async function POST(request: NextRequest) {        });

  try {

    console.log('Получен запрос на распознавание');      } else {function getVisionClient() {// Create client for Google Cloud Vision APIimport { ImageAnnotatorClient } from '@google-cloud/vision';import { ImageAnnotatorClient } from '@google-cloud/vision';

    

    const formData = await request.formData();        visionClient = new ImageAnnotatorClient();

    const file = formData.get('file') as File;

          }  if (!visionClient) {

    if (!file) {

      return NextResponse.json(      

        { error: 'Файл не найден' },

        { status: 400 }      console.log('Google Vision API client initialized');    try {let visionClient: ImageAnnotatorClient | null = null;

      );

    }    } catch (error) {

    

    console.log(`Файл: ${file.name}, тип: ${file.type}`);      console.error('Failed to initialize Google Vision client:', error);      // Check if we have credentials in environment variables

    

    // Проверка типа файла      throw new Error('Google Vision API не настроен');

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

    if (!validTypes.includes(file.type)) {    }      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;import { enhanceImageForOCR, binarizeImage, enhanceInvoiceImage, enhanceTableImage } from '@/lib/image-processing';import { enhanceImageForOCR, binarizeImage, enhanceInvoiceImage, enhanceTableImage } from     }

      return NextResponse.json(

        {   }

          error: 'Поддерживаются только изображения: JPEG, PNG, WEBP, HEIC',

          suggestions: ['Используйте изображение в поддерживаемом формате']        

        },

        { status: 400 }  return visionClient;

      );

    }}      if (credentials) {// Initialize Google Vision client

    

    // Проверка размера

    if (file.size > 10 * 1024 * 1024) {

      return NextResponse.json(export async function POST(request: NextRequest) {        // Parse credentials from environment variable

        { 

          error: 'Файл слишком большой (максимум 10MB)',  try {

          suggestions: ['Сожмите изображение']

        },    console.log('Получен запрос на распознавание');        const credentialsObj = JSON.parse(credentials);function getVisionClient() {import { convertPdfToImage } from '@/lib/pdf-processing';  } catch (error: any) {

        { status: 400 }

      );    

    }

        const formData = await request.formData();        

    const imageBuffer = Buffer.from(await file.arrayBuffer());

    console.log(`Буфер готов: ${imageBuffer.length} байт`);    const file = formData.get('file') as File;

    

    const client = getVisionClient();            visionClient = new ImageAnnotatorClient({  if (!visionClient) {

    

    console.log('Запускаем распознавание...');    if (!file) {

    const [result] = await client.textDetection({

      image: { content: imageBuffer }      return NextResponse.json(          credentials: credentialsObj,

    });

            { error: 'Файл не найден' },

    const detections = result.textAnnotations;

            { status: 400 }          projectId: credentialsObj.project_id    try {    console.error('Глобальная ошибка в API распознавания счетов:', error);

    if (!detections || detections.length === 0) {

      console.log('Текст не найден');      );

      return NextResponse.json(

        {    }        });

          error: 'Текст не найден в изображении',

          suggestions: [    

            'Проверьте качество изображения',

            'Убедитесь, что документ читаемый'    console.log(`Файл: ${file.name}, тип: ${file.type}`);      } else {      // Check if we have credentials in environment variables

          ]

        },    

        { status: 400 }

      );    // Проверка типа файла        // Fallback to default authentication

    }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

    const rawText = detections[0].description || '';

    console.log(`Распознано ${rawText.length} символов`);    if (!validTypes.includes(file.type)) {        visionClient = new ImageAnnotatorClient();      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;// Create client for Google Cloud Vision API    return NextResponse.json(

    

    const extractedData = extractBasicData(rawText);      return NextResponse.json(

    

    return NextResponse.json({        {       }

      success: true,

      rawText: rawText,          error: 'Поддерживаются только изображения: JPEG, PNG, WEBP, HEIC',

      extractedData: extractedData,

      method: 'google-vision'          suggestions: ['Используйте изображение в поддерживаемом формате']            

    });

            },

  } catch (error: any) {

    console.error('Ошибка:', error);        { status: 400 }      console.log('Google Vision API client initialized successfully');

    

    return NextResponse.json(      );

      {

        error: 'Ошибка сервера',    }    } catch (error) {      if (credentials) {let visionClient: ImageAnnotatorClient | null = null;      { 

        details: error.message,

        suggestions: ['Попробуйте еще раз']    

      },

      { status: 500 }    // Проверка размера      console.error('Failed to initialize Google Vision client:', error);

    );

  }    if (file.size > 10 * 1024 * 1024) {

}

      return NextResponse.json(      throw new Error('Google Vision API не настроен правильно');        // Parse credentials from environment variable

function extractBasicData(text: string) {

  const data: any = {        { 

    numbers: [],

    dates: [],          error: 'Файл слишком большой (максимум 10MB)',    }

    amounts: []

  };          suggestions: ['Сожмите изображение']

  

  // Числа        },  }        const credentialsObj = JSON.parse(credentials);        error: 'Внутренняя ошибка сервера', 

  const numbers = text.match(/\d+(?:[.,]\d+)*/gi) || [];

  data.numbers = numbers.slice(0, 10);        { status: 400 }

  

  // Даты      );  

  const dates = text.match(/\d{1,2}[./]\d{1,2}[./]\d{2,4}/gi) || [];

  data.dates = dates.slice(0, 5);    }

  

  // Суммы      return visionClient;        

  const amounts = text.match(/\d+(?:[.,]\d+)*\s*(?:руб|₽|RUB)/gi) || [];

  data.amounts = amounts.slice(0, 5);    const imageBuffer = Buffer.from(await file.arrayBuffer());

  

  return data;    console.log(`Буфер готов: ${imageBuffer.length} байт`);}

}
    

    const client = getVisionClient();        visionClient = new ImageAnnotatorClient({try {        details: error.message || 'Неизвестная ошибка',

    

    console.log('Запускаем распознавание...');// Main API handler

    const [result] = await client.textDetection({

      image: { content: imageBuffer }export async function POST(request: NextRequest) {          credentials: credentialsObj,

    });

      try {

    const detections = result.textAnnotations;

        console.log('🔍 Получен запрос на распознавание счета');          projectId: credentialsObj.project_id  // Initialize client with credentials from environment variables        suggestions: [

    if (!detections || detections.length === 0) {

      console.log('Текст не найден');    

      return NextResponse.json(

        {    // Parse form data        });

          error: 'Текст не найден в изображении',

          suggestions: [    const formData = await request.formData();

            'Проверьте качество изображения',

            'Убедитесь, что документ читаемый'    const file = formData.get('file') as File;      } else {  const auth = new GoogleAuth({          'Попробуйте повторить запрос позже',

          ]

        },    

        { status: 400 }

      );    if (!file) {        // Fallback to default authentication

    }

          return NextResponse.json(

    const rawText = detections[0].description || '';

    console.log(`Распознано ${rawText.length} символов`);        { error: 'Файл не найден в запросе' },        visionClient = new ImageAnnotatorClient();    credentials: {          'Убедитесь, что файл не поврежден',

    

    const extractedData = extractBasicData(rawText);        { status: 400 }

    

    return NextResponse.json({      );      }

      success: true,

      rawText: rawText,    }

      extractedData: extractedData,

      method: 'google-vision'                client_email: process.env.GOOGLE_CLIENT_EMAIL,          'Попробуйте файл меньшего размера или другого формата'

    });

        console.log(`📄 Обрабатываем файл: ${file.name}, размер: ${file.size} байт, тип: ${file.type}`);

  } catch (error: any) {

    console.error('Ошибка:', error);          console.log('Google Vision API client initialized successfully');

    

    return NextResponse.json(    // Validate file type (only images now)

      {

        error: 'Ошибка сервера',    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];    } catch (error) {      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),        ]

        details: error.message,

        suggestions: ['Попробуйте еще раз']    if (!validImageTypes.includes(file.type)) {

      },

      { status: 500 }      return NextResponse.json(      console.error('Failed to initialize Google Vision client:', error);

    );

  }        { 

}

          error: 'Неподдерживаемый тип файла. Поддерживаются только изображения: JPEG, PNG, WEBP, HEIC',      throw new Error('Google Vision API не настроен правильно');    },      },

function extractBasicData(text: string) {

  const data: any = {          suggestions: [

    numbers: [],

    dates: [],            'Используйте изображения в формате JPEG, PNG, WEBP или HEIC',    }

    amounts: []

  };            'Убедитесь, что файл не поврежден'

  

  // Числа          ]  }    scopes: ['https://www.googleapis.com/auth/cloud-platform'],      { status: 500, headers: { 'Content-Type': 'application/json' } }

  const numbers = text.match(/\d+(?:[.,]\d+)*/gi) || [];

  data.numbers = numbers.slice(0, 10);        },

  

  // Даты        { status: 400 }  

  const dates = text.match(/\d{1,2}[./]\d{1,2}[./]\d{2,4}/gi) || [];

  data.dates = dates.slice(0, 5);      );

  

  // Суммы    }  return visionClient;  });    );

  const amounts = text.match(/\d+(?:[.,]\d+)*\s*(?:руб|₽|RUB)/gi) || [];

  data.amounts = amounts.slice(0, 5);    

  

  return data;    // Validate file size (max 10MB)}

}
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {  }

      return NextResponse.json(

        { // Main API handler

          error: 'Файл слишком большой. Максимальный размер: 10MB',

          suggestions: [export async function POST(request: NextRequest) {  visionClient = new ImageAnnotatorClient({ auth });}

            'Сожмите изображение',

            'Используйте файл меньшего размера'  try {

          ]

        },    console.log('🔍 Получен запрос на распознавание счета');} catch (error) {

        { status: 400 }

      );    

    }

        // Parse form data  console.error('Error initializing Google Vision API client:', error);/**

    // Convert file to buffer

    const imageBuffer = Buffer.from(await file.arrayBuffer());    const formData = await request.formData();

    console.log(`🖼️ Изображение загружено, размер буфера: ${imageBuffer.length} байт`);

        const file = formData.get('file') as File;} * Извлекает структурированные данные из распознанного текста счета

    // Initialize Google Vision client

    const client = getVisionClient();    

    

    // Perform text detection using Google Vision API    if (!file) { * @param fullText Полный текст документа

    console.log('🔍 Запускаем распознавание текста через Google Vision API...');

          return NextResponse.json(

    const [result] = await client.textDetection({

      image: {        { error: 'Файл не найден в запросе' },export async function POST(request: NextRequest) { * @param textElements Отдельные элементы текста с координатами

        content: imageBuffer

      }        { status: 400 }

    });

          );  try { * @returns Объект с данными счета

    const detections = result.textAnnotations;

        }

    if (!detections || detections.length === 0) {

      console.log('❌ Текст не найден в изображении');        // Check if client is initialized */

      return NextResponse.json(

        {    console.log(`📄 Обрабатываем файл: ${file.name}, размер: ${file.size} байт, тип: ${file.type}`);

          error: 'Текст не найден в изображении',

          suggestions: [        if (!visionClient) {function extractInvoiceData(

            'Убедитесь, что изображение содержит текст',

            'Проверьте качество изображения',    // Validate file type (only images now)

            'Используйте более четкое изображение',

            'Убедитесь, что документ полностью в кадре'    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];      console.error('Google Vision API client not initialized');  fullText: string, 

          ]

        },    if (!validImageTypes.includes(file.type)) {

        { status: 400 }

      );      return NextResponse.json(      return NextResponse.json(  textElements: Array<{text: string, confidence: number, boundingBox: any[]}>

    }

            { 

    // Extract full text

    const rawText = detections[0].description || '';          error: 'Неподдерживаемый тип файла. Поддерживаются только изображения: JPEG, PNG, WEBP, HEIC',        { error: 'Ошибка конфигурации Google Vision API' },) {

    console.log(`✅ Распознан текст длиной ${rawText.length} символов`);

              suggestions: [

    // Basic invoice data extraction

    const invoiceData = extractInvoiceData(rawText);            'Используйте изображения в формате JPEG, PNG, WEBP или HEIC',        { status: 500, headers: { 'Content-Type': 'application/json' } }  // Инициализация объекта с данными счета

    

    // Return successful response            'Убедитесь, что файл не поврежден'

    return NextResponse.json({

      success: true,          ]      );  const data: {

      rawText: rawText,

      extractedData: invoiceData,        },

      confidence: 'high', // Google Vision typically has high confidence

      method: 'google-vision'        { status: 400 }    }    invoiceNumber?: string;

    });

          );

  } catch (error: any) {

    console.error('❌ Ошибка в API распознавания счетов:', error);    }    invoiceDate?: string;

    

    // Handle specific Google Vision API errors    

    if (error.code === 'UNAUTHENTICATED') {

      return NextResponse.json(    // Validate file size (max 10MB)    // Check request type    dueDate?: string;

        {

          error: 'Google Vision API не настроен или недоступен',    const maxSize = 10 * 1024 * 1024; // 10MB

          suggestions: [

            'Проверьте настройки Google Cloud Vision API',    if (file.size > maxSize) {    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {    totalAmount?: string;

            'Убедитесь, что API ключи настроены правильно'

          ]      return NextResponse.json(

        },

        { status: 500 }        {       return NextResponse.json(    totalAmountWithVAT?: string;

      );

    }          error: 'Файл слишком большой. Максимальный размер: 10MB',

    

    return NextResponse.json(          suggestions: [        {     vatAmount?: string;

      {

        error: 'Внутренняя ошибка сервера',            'Сожмите изображение',

        details: error.message || 'Неизвестная ошибка',

        suggestions: [            'Используйте файл меньшего размера'          error: 'Неверный формат запроса. Ожидается multipart/form-data',    supplier?: {

          'Попробуйте еще раз',

          'Используйте другое изображение',          ]

          'Обратитесь к администратору если проблема повторяется'

        ]        },          suggestions: ['Проверьте правильность отправки формы']      name?: string;

      },

      { status: 500 }        { status: 400 }

    );

  }      );        },      inn?: string;

}

    }

// Basic invoice data extraction function

function extractInvoiceData(text: string) {            { status: 400, headers: { 'Content-Type': 'application/json' } }      kpp?: string;

  const data: any = {

    numbers: [],    // Convert file to buffer

    dates: [],

    amounts: [],    const imageBuffer = Buffer.from(await file.arrayBuffer());      );      address?: string;

    companies: []

  };    console.log(`🖼️ Изображение загружено, размер буфера: ${imageBuffer.length} байт`);

  

  // Extract numbers (potential invoice numbers, amounts)        }    };

  const numberPattern = /\d+(?:[.,]\d+)*(?:\s*(?:руб|₽|RUB|USD|\$|EUR|€))?/gi;

  const numbers = text.match(numberPattern) || [];    // Initialize Google Vision client

  data.numbers = numbers.slice(0, 10); // Limit to first 10

      const client = getVisionClient();    customer?: {

  // Extract dates

  const datePattern = /\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4}/gi;    

  const dates = text.match(datePattern) || [];

  data.dates = dates.slice(0, 5); // Limit to first 5    // Perform text detection using Google Vision API    // Get form from request      name?: string;

  

  // Extract potential amounts (numbers with currency)    console.log('🔍 Запускаем распознавание текста через Google Vision API...');

  const amountPattern = /\d+(?:[.,]\d+)*\s*(?:руб|₽|RUB|USD|\$|EUR|€)/gi;

  const amounts = text.match(amountPattern) || [];        const formData = await request.formData();      inn?: string;

  data.amounts = amounts.slice(0, 5); // Limit to first 5

      const [result] = await client.textDetection({

  // Extract potential company names (words in uppercase or with "ООО", "ИП", etc.)

  const companyPattern = /(?:ООО|ИП|ЗАО|ОАО|ФГУП)\s+[А-ЯЁ][а-яё\s"]*[А-ЯЁа-яё"]/g;      image: {    const file = formData.get('file') as File | null;      address?: string;

  const companies = text.match(companyPattern) || [];

  data.companies = companies.slice(0, 3); // Limit to first 3        content: imageBuffer

  

  return data;      }    };

}
    });

        if (!file) {    paymentInfo?: {

    const detections = result.textAnnotations;

          return NextResponse.json(      bankName?: string;

    if (!detections || detections.length === 0) {

      console.log('❌ Текст не найден в изображении');        { error: 'Файл не найден в запросе' },      bankAccount?: string;

      return NextResponse.json(

        {        { status: 400, headers: { 'Content-Type': 'application/json' } }      correspondentAccount?: string;

          error: 'Текст не найден в изображении',

          suggestions: [      );      bic?: string;

            'Убедитесь, что изображение содержит текст',

            'Проверьте качество изображения',    }    };

            'Используйте более четкое изображение',

            'Убедитесь, что документ полностью в кадре'    items?: Array<{

          ]

        },    // Get file extension      name?: string;

        { status: 400 }

      );    const fileExtension = file.name.split('.').pop()?.toLowerCase();      quantity?: string;

    }

              unit?: string;

    // Extract full text

    const rawText = detections[0].description || '';    // Get file data as ArrayBuffer      price?: string;

    console.log(`✅ Распознан текст длиной ${rawText.length} символов`);

        const fileBuffer = Buffer.from(await file.arrayBuffer());      amount?: string;

    // Basic invoice data extraction

    const invoiceData = extractInvoiceData(rawText);        }>;

    

    // Return successful response    // Variable to store image buffer (for PDF or image)  } = {

    return NextResponse.json({

      success: true,    let imageBuffer: Buffer = fileBuffer; // Default to the original buffer    supplier: {},

      rawText: rawText,

      extractedData: invoiceData,        customer: {},

      confidence: 'high', // Google Vision typically has high confidence

      method: 'google-vision'    // Process file based on extension    paymentInfo: {},

    });

        if (fileExtension === 'pdf') {    items: []

  } catch (error: any) {

    console.error('❌ Ошибка в API распознавания счетов:', error);      try {  };

    

    // Handle specific Google Vision API errors        // Convert PDF to image  

    if (error.code === 'UNAUTHENTICATED') {

      return NextResponse.json(        try {  // Поиск номера счета

        {

          error: 'Google Vision API не настроен или недоступен',          const convertedBuffer = await convertPdfToImage(fileBuffer);  const invoiceNumberRegex = /(?:счет|счёт|счета|invoice|№|номер)[^0-9]*([0-9\/-]+)/i;

          suggestions: [

            'Проверьте настройки Google Cloud Vision API',          if (convertedBuffer) {  const invoiceNumberMatch = fullText.match(invoiceNumberRegex);

            'Убедитесь, что API ключи настроены правильно'

          ]            imageBuffer = convertedBuffer;  if (invoiceNumberMatch && invoiceNumberMatch[1]) {

        },

        { status: 500 }          } else {    data.invoiceNumber = invoiceNumberMatch[1].trim();

      );

    }            throw new Error('Не удалось конвертировать PDF в изображение');  }

    

    return NextResponse.json(          }  

      {

        error: 'Внутренняя ошибка сервера',        } catch (conversionError: any) {  // Поиск даты счета

        details: error.message || 'Неизвестная ошибка',

        suggestions: [          console.error('Ошибка при конвертации PDF в изображение:', conversionError);  const dateRegex = /(?:от|date)[^0-9]*(\d{1,2}[.,-\/]\d{1,2}[.,-\/]\d{2,4}|\d{1,2}\s+[а-яА-Яa-zA-Z]+\s+\d{4})/i;

          'Попробуйте еще раз',

          'Используйте другое изображение',          return NextResponse.json(  const dateMatch = fullText.match(dateRegex);

          'Обратитесь к администратору если проблема повторяется'

        ]            {   if (dateMatch && dateMatch[1]) {

      },

      { status: 500 }              error: 'Ошибка при обработке PDF документа',     data.invoiceDate = dateMatch[1].trim();

    );

  }              details: conversionError.message || 'Неизвестная ошибка',  }

}

              suggestions: [  

// Basic invoice data extraction function

function extractInvoiceData(text: string) {                'Попробуйте изображение лучшего качества',  // Поиск суммы

  const data: any = {

    numbers: [],                'Убедитесь, что PDF документ не поврежден',  const totalAmountRegex = /(?:итого|всего|total|сумма|sum)[^0-9]*(\d[\d\s,.]*\d)/i;

    dates: [],

    amounts: [],                'Попробуйте загрузить документ в другом формате (JPG, PNG)'  const totalAmountMatch = fullText.match(totalAmountRegex);

    companies: []

  };              ]  if (totalAmountMatch && totalAmountMatch[1]) {

  

  // Extract numbers (potential invoice numbers, amounts)            },    data.totalAmount = totalAmountMatch[1].trim().replace(/\s/g, '');

  const numberPattern = /\d+(?:[.,]\d+)*(?:\s*(?:руб|₽|RUB|USD|\$|EUR|€))?/gi;

  const numbers = text.match(numberPattern) || [];            { status: 500, headers: { 'Content-Type': 'application/json' } }  }

  data.numbers = numbers.slice(0, 10); // Limit to first 10

            );  

  // Extract dates

  const datePattern = /\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4}/gi;        }  // Поиск НДС

  const dates = text.match(datePattern) || [];

  data.dates = dates.slice(0, 5); // Limit to first 5      } catch (pdfError) {  const vatRegex = /(?:ндс|vat)[^0-9]*(\d[\d\s,.]*\d)/i;

  

  // Extract potential amounts (numbers with currency)        console.error('Общая ошибка при обработке PDF:', pdfError);  const vatMatch = fullText.match(vatRegex);

  const amountPattern = /\d+(?:[.,]\d+)*\s*(?:руб|₽|RUB|USD|\$|EUR|€)/gi;

  const amounts = text.match(amountPattern) || [];        return NextResponse.json(  if (vatMatch && vatMatch[1]) {

  data.amounts = amounts.slice(0, 5); // Limit to first 5

            {     data.vatAmount = vatMatch[1].trim().replace(/\s/g, '');

  // Extract potential company names (words in uppercase or with "ООО", "ИП", etc.)

  const companyPattern = /(?:ООО|ИП|ЗАО|ОАО|ФГУП)\s+[А-ЯЁ][а-яё\s"]*[А-ЯЁа-яё"]/g;            error: 'Ошибка при обработке PDF документа',  }

  const companies = text.match(companyPattern) || [];

  data.companies = companies.slice(0, 3); // Limit to first 3            suggestions: [  

  

  return data;              'Попробуйте изображение лучшего качества',  // Поиск ИНН поставщика

}
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