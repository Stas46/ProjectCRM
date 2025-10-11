import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Инициализация Google Vision
const vision = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export async function POST(request: NextRequest) {
  console.log('📨 [SMART-INVOICE] Получен новый запрос');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dpi = (formData.get('dpi') as string) || '200';
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    
    console.log(`📄 [SMART-INVOICE] Файл: ${file.name}, Размер: ${file.size} байт, Тип: ${file.type}`);
    
    // Проверяем тип файла
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const supportedTypes = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'txt'];
    
    if (!fileExtension || !supportedTypes.includes(fileExtension)) {
      return NextResponse.json({ 
        error: `Неподдерживаемый формат файла. Поддерживаются: ${supportedTypes.join(', ')}` 
      }, { status: 400 });
    }
    
    // Сохраняем файл временно
    const buffer = await file.arrayBuffer();
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `upload_${Date.now()}.${fileExtension}`);
    await fs.writeFile(tempFilePath, Buffer.from(buffer));
    
    console.log(`💾 [SMART-INVOICE] Файл сохранен: ${tempFilePath}`);
    
    let fullText = '';
    
    // Определяем способ обработки файла
    if (['xlsx', 'xls', 'docx', 'doc'].includes(fileExtension)) {
      // Обработка Office документов
      console.log(`📊 [SMART-INVOICE] Извлечение текста из Office документа...`);
      
      const officeScriptPath = path.join(process.cwd(), 'python-scripts', 'office_to_text.py');
      const pythonExecutable = 'C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe';
      
      const officeResult = await runPythonScript(pythonExecutable, officeScriptPath, [tempFilePath]);
      
      if (!officeResult.success) {
        throw new Error(`Ошибка извлечения текста из Office документа: ${officeResult.error}`);
      }
      
      try {
        // Если результат уже распарсен
        const textResult = officeResult.parsed || JSON.parse(officeResult.output);
        if (textResult.error) {
          throw new Error(textResult.error);
        }
        
        fullText = textResult.text || '';
        console.log(`✅ [SMART-INVOICE] Текст извлечен: ${textResult.text_length} символов`);
      } catch (parseError) {
        throw new Error(`Ошибка парсинга результата: ${parseError}`);
      }
      
    } else if (fileExtension === 'txt') {
      // Обработка текстовых файлов
      console.log(`📝 [SMART-INVOICE] Чтение текстового файла...`);
      
      try {
        fullText = await fs.readFile(tempFilePath, 'utf-8');
        console.log(`✅ [SMART-INVOICE] Текст прочитан: ${fullText.length} символов`);
      } catch (error) {
        throw new Error(`Ошибка чтения текстового файла: ${error}`);
      }
      
    } else {
      // Обработка PDF файлов
      console.log(`📄 [SMART-INVOICE] Конвертация PDF в изображения...`);

      // Шаг 1: Конвертируем PDF в изображения
      const pdfToPngScript = path.join(process.cwd(), 'python-scripts', 'pdf_to_png.py');
      const pythonExecutable = 'C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe';
      
      const conversionResult = await runPythonScript(pythonExecutable, pdfToPngScript, [
        tempFilePath,
        '--dpi', dpi
      ]);
      
      if (!conversionResult.success) {
        throw new Error(`Ошибка конвертации PDF: ${conversionResult.error}`);
      }
      
      console.log(`✅ [SMART-INVOICE] PDF конвертирован`);
      console.log(`🔍 [SMART-INVOICE] Результат конвертации:`, conversionResult);
      
      // Парсим результат, если он не был распарсен автоматически
      let pdfData;
      if (conversionResult.parsed) {
        pdfData = conversionResult.parsed;
      } else {
        try {
          pdfData = JSON.parse(conversionResult.output);
        } catch (e) {
          throw new Error(`Ошибка парсинга результата PDF конвертации: ${conversionResult.output}`);
        }
      }
      
      console.log(`✅ [SMART-INVOICE] PDF конвертирован: ${pdfData.page_count} страниц`);
      
      // Шаг 2: OCR через Google Vision
      if (!pdfData.images || !Array.isArray(pdfData.images)) {
        throw new Error(`Не удалось получить изображения из PDF. pdfData.images: ${JSON.stringify(pdfData.images)}`);
      }
      
      const ocrResults = [];
      
      for (const image of pdfData.images) {
        console.log(`🔍 [SMART-INVOICE] OCR страницы ${image.page}...`);
        
        const imageBuffer = Buffer.from(image.base64, 'base64');
        
        // Пробуем оба метода OCR и выбираем лучший результат
        console.log(`📋 [SMART-INVOICE] Используем documentTextDetection...`);
        const [docResult] = await vision.documentTextDetection({
          image: { content: imageBuffer },
          imageContext: {
            languageHints: ['ru', 'en'],
          },
        });
        
        console.log(`📋 [SMART-INVOICE] Используем textDetection...`);
        const [textResult] = await vision.textDetection({
          image: { content: imageBuffer },
        });
        
        let pageText = '';
        let docText = '';
        let simpleText = '';
        
        // Извлекаем текст из documentTextDetection
        if (docResult.fullTextAnnotation) {
          docText = docResult.fullTextAnnotation.text || '';
        } else if (docResult.textAnnotations && Array.isArray(docResult.textAnnotations) && docResult.textAnnotations.length > 0) {
          docText = docResult.textAnnotations[0].description || '';
        }
        
        // Извлекаем текст из textDetection
        if (textResult.textAnnotations && Array.isArray(textResult.textAnnotations) && textResult.textAnnotations.length > 0) {
          simpleText = textResult.textAnnotations[0].description || '';
        }
        
        // Выбираем лучший результат (больше текста = лучше)
        if (docText.length > simpleText.length) {
          pageText = docText;
          console.log(`📄 [SMART-INVOICE] Выбран documentTextDetection: ${docText.length} символов`);
        } else {
          pageText = simpleText;
          console.log(`📄 [SMART-INVOICE] Выбран textDetection: ${simpleText.length} символов`);
        }
        
        console.log(`📝 [SMART-INVOICE] Текст страницы ${image.page} (первые 200 символов):`, pageText.substring(0, 200));
        
        fullText += pageText + '\n';
        
        ocrResults.push({
          page: image.page,
          text: pageText,
          confidence: (Array.isArray(textResult.textAnnotations) && textResult.textAnnotations.length > 0) ? (textResult.textAnnotations[0].score || 0) : 0
        });
      }
      
      console.log(`✅ [SMART-INVOICE] OCR завершен, извлечено ${fullText.length} символов`);
    }
    
    // Шаг 3: Парсинг извлеченного текста
    console.log(`🧠 [SMART-INVOICE] Запуск парсера счетов...`);
    
    const parserScript = path.join(process.cwd(), 'python-scripts', 'ultimate_invoice_parser.py');
    const pythonExecutable = 'C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe';
    
    // Используем весь извлеченный текст для парсинга
    const textForParsing = fullText;
    console.log(`📝 [SMART-INVOICE] Текст для парсинга (${textForParsing.length} символов):`, textForParsing.substring(0, 200) + '...');
    
    // Записываем текст во временный файл, чтобы избежать проблем с кавычками
    const textFilePath = path.join(tempDir, `text_${Date.now()}.txt`);
    await fs.writeFile(textFilePath, textForParsing, 'utf-8');
    
    // Дополнительная отладка - сохраняем полный текст для анализа
    const debugTextPath = path.join(tempDir, `debug_full_text_${Date.now()}.txt`);
    await fs.writeFile(debugTextPath, textForParsing, 'utf-8');
    console.log(`🔍 [SMART-INVOICE] Полный текст сохранен в: ${debugTextPath}`);
    
    // Передаем путь к файлу парсеру
    const parseResult = await runPythonScript(pythonExecutable, parserScript, ['--file', textFilePath, '--output-format', 'json']);
    
    // Удаляем временный текстовый файл
    try {
      await fs.unlink(textFilePath);
    } catch (e) {
      console.warn('⚠️ [SMART-INVOICE] Не удалось удалить временный текстовый файл:', e);
    }
    
    if (!parseResult.success) {
      throw new Error(`Ошибка парсинга счета: ${parseResult.error}`);
    }
    
    // Парсим результат
    console.log(`📊 [SMART-INVOICE] Результат парсера:`, parseResult.output.substring(0, 500));
    
    let parsedData;
    try {
      // Если результат уже распарсен в runPythonScript
      parsedData = parseResult.parsed || JSON.parse(parseResult.output);
      
      // Проверяем, есть ли ошибка в результате парсинга
      if (parsedData.error) {
        console.log(`⚠️ [SMART-INVOICE] Парсер определил неподходящий документ: ${parsedData.error}`);
        return NextResponse.json({
          success: false,
          error: parsedData.error,
          message: parsedData.message || 'Ошибка при анализе документа',
          document_type: parsedData.document_type || 'unknown'
        }, { status: 400 });
      }
      
    } catch (e) {
      console.error('❌ [SMART-INVOICE] Не удалось распарсить JSON:', parseResult.output);
      console.error('❌ [SMART-INVOICE] Ошибка парсинга:', e);
      
      // Если парсер вернул readable формат, попробуем извлечь основную информацию
      if (parseResult.output.includes('Номер счета:')) {
        console.log('🔄 [SMART-INVOICE] Парсер вернул readable формат, извлекаем данные...');
        
        // Создаем базовый объект с доступными данными
        parsedData = {
          invoice: {
            number: null as string | null,
            date: null as string | null,
            due_date: null as string | null,
            total_amount: null as number | null,
            vat_amount: null as number | null,
            vat_rate: null as number | null,
            has_vat: false
          },
          contractor: {
            name: null as string | null,
            inn: null as string | null,
            kpp: null as string | null,
            address: null as string | null
          },
          items: [] as any[]
        };
        
        // Пытаемся извлечь данные напрямую из исходного текста
        console.log('🔍 [SMART-INVOICE] Извлекаем данные из исходного текста...');
        
        // Ищем данные в исходном тексте
        const invoiceNumberMatch = textForParsing.match(/(?:СЧЕТ|Счет)\s*(?:на оплату\s*)?№\s*([А-Я\d\-]+)/i) || 
                                  textForParsing.match(/№\s*([А-Я\d\-]+)\s*от/i);
        const invoiceDateMatch = textForParsing.match(/от\s*(\d{1,2})\s*([а-яё]+)\s*(\d{4})/i) ||
                               textForParsing.match(/(\d{1,2})\s*([а-яё]+)\s*(\d{4})\s*г/i);
        const totalAmountMatch = textForParsing.match(/(?:Всего к оплате|Итого|ИТОГО):\s*([\d\s.,]+)/i);
        const vatAmountMatch = textForParsing.match(/(?:том числе НДС|НДС):\s*([\d\s.,]+)/i);
        
        console.log('🔍 [INVOICE] Поиск номера счета...');
        console.log('🔍 [INVOICE] invoiceNumberMatch:', invoiceNumberMatch);
        console.log('🔍 [INVOICE] Поиск даты...');
        console.log('🔍 [INVOICE] invoiceDateMatch:', invoiceDateMatch);
        
        // Правильный поиск контрагента (поставщика, а не покупателя)
        let contractorName = '';
        
        console.log('🔍 [CONTRACTOR] Начинаем поиск поставщика...');
        console.log('🔍 [CONTRACTOR] Первые 500 символов текста:', textForParsing.substring(0, 500));
        
        // 1. Сначала ищем по явному указанию "Поставщик:"
        const supplierMatch = textForParsing.match(/Поставщик:\s*([^\n\r,]+?)(?:,|\s*ИНН|\s*КПП|\s*Адрес:|\s*тел\.|\s*$)/i);
        if (supplierMatch) {
          contractorName = supplierMatch[1].trim();
          console.log(`🔍 [CONTRACTOR] Найден поставщик по ключевому слову: "${contractorName}"`);
        }
        
        // 2. Ищем "Группа компаний СтиС" в начале документа
        if (!contractorName) {
          const stisInHeaderMatch = textForParsing.match(/(?:^|[\s\n])(?:\d+\/\d+\s+)?ООО\s*"?Группа компаний\s*"?([^"\n\r]*?)"?(?:\s|$)/i);
          if (stisInHeaderMatch) {
            const addition = stisInHeaderMatch[1] ? stisInHeaderMatch[1].trim().replace(/"/g, '') : '';
            contractorName = addition ? `ООО "Группа компаний ${addition}"` : 'ООО "Группа компаний"';
            console.log(`🔍 [CONTRACTOR] Найдена "Группа компаний" в заголовке: "${contractorName}"`);
          }
        }
        
        // 3. Ищем в банковских реквизитах (секция "Получатель")
        if (!contractorName) {
          const receiverSectionMatch = textForParsing.match(/Получатель[\s\S]*?(?:ООО|ИП|ЗАО|ПАО|АО)\s*"?([^"\n\r]+?)"?\s*(?:Сч\.|ИНН|\s)/i);
          if (receiverSectionMatch) {
            const companyTypeMatch = textForParsing.match(/Получатель[\s\S]*?(ООО|ИП|ЗАО|ПАО|АО)/i);
            const companyType = companyTypeMatch ? companyTypeMatch[1] : 'ООО';
            contractorName = `${companyType} ${receiverSectionMatch[1]}`.trim();
            console.log(`🔍 [CONTRACTOR] Найден получатель в банковских реквизитах: "${contractorName}"`);
          }
        }
        
        // 4. Исключаем строки с "Заказчик:" и "Покупатель:" и ищем первую компанию
        if (!contractorName) {
          // Более агрессивное исключение покупателя/заказчика
          const excludePatterns = [
            /Заказчик:[\s\S]*?(?=\n[А-Я]|$)/gi,
            /Покупатель:[\s\S]*?(?=\n[А-Я]|$)/gi
          ];
          
          let cleanText = textForParsing;
          excludePatterns.forEach(pattern => {
            cleanText = cleanText.replace(pattern, '');
          });
          
          console.log('🔍 [CONTRACTOR] Текст после исключения покупателя (первые 300 символов):', cleanText.substring(0, 300));
          
          const firstCompanyMatch = cleanText.match(/(ООО|ИП|ЗАО|ПАО|АО)\s*"?([^"\n\r,]+?)(?:",|\s*ИНН|\s*КПП|\s*Сч\.|\s|$)/i);
          if (firstCompanyMatch) {
            contractorName = `${firstCompanyMatch[1]} ${firstCompanyMatch[2]}`.trim();
            console.log(`🔍 [CONTRACTOR] Найдена первая компания после очистки: "${contractorName}"`);
          }
        }
        
        // Поиск ИНН поставщика (не покупателя)
        let innMatch = null;
        
        console.log('🔍 [INN] Начинаем поиск ИНН поставщика...');
        
        // 1. Если у нас есть название поставщика, ищем ИНН рядом с ним
        if (contractorName) {
          // Ищем ИНН в секции поставщика
          const supplierSectionMatch = textForParsing.match(/Поставщик:[\s\S]*?ИНН\s*(\d{10,12})/i);
          if (supplierSectionMatch) {
            innMatch = [supplierSectionMatch[0], supplierSectionMatch[1]];
            console.log('🔍 [INN] Найден ИНН в секции поставщика:', supplierSectionMatch[1]);
          }
        }
        
        // 2. Ищем ИНН рядом с "Группа компаний" (специальный случай)
        if (!innMatch && contractorName.includes('Группа компаний')) {
          console.log('🔍 [INN] Ищем ИНН для "Группа компаний"...');
          
          // Паттерн 1: 7720774346/470645001 ООО "Группа компаний "СтиС"
          const stisInnBeforeMatch = textForParsing.match(/(\d{10,12})\/\d+\s+ООО\s*"?Группа компаний/i);
          if (stisInnBeforeMatch) {
            innMatch = [stisInnBeforeMatch[0], stisInnBeforeMatch[1]];
            console.log('🔍 [INN] Найден ИНН ПЕРЕД "Группа компаний":', stisInnBeforeMatch[1]);
          } else {
            // Паттерн 2: ООО "Группа компаний" ... ИНН 7720774346
            const stisInnAfterMatch = textForParsing.match(/ООО\s*"?Группа компаний[\s\S]*?ИНН[\s:]*(\d{10,12})/i);
            if (stisInnAfterMatch) {
              innMatch = [stisInnAfterMatch[0], stisInnAfterMatch[1]];
              console.log('🔍 [INN] Найден ИНН ПОСЛЕ "Группа компаний":', stisInnAfterMatch[1]);
            } else {
              // Паттерн 3: поиск номера на следующей строке после поставщика
              const supplierLineMatch = textForParsing.match(/Поставщик[:\s]*[^\n]*Группа компаний[^\n]*\n\s*(\d{10,12})/i);
              if (supplierLineMatch) {
                innMatch = [supplierLineMatch[0], supplierLineMatch[1]];
                console.log('🔍 [INN] Найден ИНН на следующей строке после "Группа компаний":', supplierLineMatch[1]);
              }
            }
          }
        }
        
        // 3. Ищем ИНН поставщика, исключая ИНН покупателя/заказчика
        if (!innMatch) {
          // Список запрещенных ИНН (покупатели/заказчики)
          const buyerInns: string[] = [];
          
          // Извлекаем ИНН из секций покупателей/заказчиков
          const buyerSections = [
            /Заказчик:[\s\S]*?ИНН[\s:]*(\d{10,12})/gi,
            /Покупатель:[\s\S]*?ИНН[\s:]*(\d{10,12})/gi
          ];
          
          buyerSections.forEach(pattern => {
            let match;
            while ((match = pattern.exec(textForParsing)) !== null) {
              buyerInns.push(match[1]);
              console.log('🚫 [INN] Найден ИНН покупателя/заказчика (исключаем):', match[1]);
            }
          });
          
          // Ищем все ИНН в документе и берем первый, который НЕ является покупателем
          const allInnMatches = textForParsing.matchAll(/ИНН[\s:]*(\d{10,12})/gi);
          for (const match of allInnMatches) {
            if (!buyerInns.includes(match[1])) {
              innMatch = [match[0], match[1]];
              console.log('🔍 [INN] Найден ИНН поставщика:', match[1]);
              break;
            }
          }
          
          // Если не нашли по паттерну "ИНН:", ищем просто числа в секции поставщика
          if (!innMatch && contractorName) {
            const supplierSectionMatch = textForParsing.match(/Поставщик[\s\S]*?(\d{10,12})/i);
            if (supplierSectionMatch && !buyerInns.includes(supplierSectionMatch[1])) {
              innMatch = [supplierSectionMatch[0], supplierSectionMatch[1]];
              console.log('🔍 [INN] Найден номер в секции поставщика:', supplierSectionMatch[1]);
            }
          }
        }
        
        // 4. В крайнем случае, берем первый ИНН из банковских реквизитов
        if (!innMatch) {
          const bankInnMatch = textForParsing.match(/Получатель[\s\S]*?ИНН[\s:]*(\d{10,12})/i);
          if (bankInnMatch) {
            innMatch = [bankInnMatch[0], bankInnMatch[1]];
            console.log('🔍 [INN] Найден ИНН в банковских реквизитах получателя:', bankInnMatch[1]);
          }
        }
        
        if (invoiceNumberMatch) {
          parsedData.invoice.number = invoiceNumberMatch[1];
          console.log('✅ Найден номер счета:', parsedData.invoice.number);
        }
        
        if (invoiceDateMatch) {
          const day = invoiceDateMatch[1];
          const month = invoiceDateMatch[2];
          const year = invoiceDateMatch[3];
          
          // Преобразуем месяц
          const months: {[key: string]: string} = {
            'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
            'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
            'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
          };
          
          const monthNum = months[month.toLowerCase()] || '01';
          parsedData.invoice.date = `${year}-${monthNum}-${day.padStart(2, '0')}`;
          console.log('✅ Найдена дата счета:', parsedData.invoice.date);
        }
        
        if (totalAmountMatch) {
          const amount = parseFloat(totalAmountMatch[1].replace(/[^\d.]/g, ''));
          if (!isNaN(amount)) {
            parsedData.invoice.total_amount = amount;
            console.log('✅ Найдена сумма:', parsedData.invoice.total_amount);
          }
        }
        
        if (vatAmountMatch) {
          const vatAmount = parseFloat(vatAmountMatch[1].replace(/[^\d.]/g, ''));
          if (!isNaN(vatAmount)) {
            parsedData.invoice.vat_amount = vatAmount;
            parsedData.invoice.has_vat = true;
            console.log('✅ Найден НДС:', parsedData.invoice.vat_amount);
          }
        }
        
        if (contractorName) {
          console.log(`🔍 Исходное название: "${contractorName}"`);
          
          // Очищаем название от лишних символов
          contractorName = contractorName
            .replace(/^["']+|["']+$/g, '') // убираем кавычки в начале и конце
            .replace(/\s+/g, ' ') // нормализуем пробелы
            .trim();
          
          // Специальная обработка для двойных кавычек в названии
          if (contractorName.includes('"')) {
            // Случай: Группа компаний "СтиС"
            contractorName = contractorName.replace(/"/g, '');
          }
          
          parsedData.contractor.name = contractorName;
          console.log('✅ Итоговое название поставщика:', parsedData.contractor.name);
        }
        
        if (innMatch) {
          parsedData.contractor.inn = innMatch[1];
          console.log('✅ Найден ИНН:', parsedData.contractor.inn);
        }
        
      } else {
        throw new Error('Ошибка обработки результата парсера');
      }
    }
    
    console.log('✅ [SMART-INVOICE] Парсинг завершен успешно');
    
    // Очистка временных файлов
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupError) {
      console.warn('⚠️ [SMART-INVOICE] Не удалось удалить временные файлы:', cleanupError);
    }
    
    return NextResponse.json({
      success: true,
      data: parsedData,
      ocr_text: fullText.substring(0, 5000) + (fullText.length > 5000 ? '...' : ''), // Увеличиваем лимит до 5000 символов
      file_info: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: fileExtension
      }
    });
    
  } catch (error: any) {
    console.error('❌ [SMART-INVOICE] Ошибка:', error.message);
    return NextResponse.json({ 
      error: error.message || 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

function runPythonScript(pythonPath: string, scriptPath: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const command = `"${pythonPath}" "${scriptPath}" ${args.map(arg => `"${arg}"`).join(' ')}`;
    
    console.log(`🐍 [PYTHON] Выполнение: ${command}`);
    
    exec(command, { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB буфер
    }, (error, stdout, stderr) => {
      console.log(`🐍 [PYTHON] stdout:`, stdout);
      console.log(`🐍 [PYTHON] stderr:`, stderr);
      
      if (error) {
        console.error('❌ [PYTHON] Ошибка выполнения:', error.message);
        console.error('❌ [PYTHON] exit code:', error.code);
        resolve({ success: false, error: error.message, stderr, stdout });
        return;
      }
      
      if (stderr && stderr.trim()) {
        console.warn('⚠️ [PYTHON] stderr:', stderr);
        // Если есть stderr, но нет ошибки выполнения, все равно возвращаем ошибку
        if (stderr.includes('Error:') || stderr.includes('Exception:') || stderr.includes('Traceback:')) {
          resolve({ success: false, error: stderr, stderr, stdout });
          return;
        }
      }
      
      console.log('✅ [PYTHON] Выполнено успешно');
      
      try {
        const result = JSON.parse(stdout);
        resolve({ success: true, output: stdout.trim(), parsed: result });
      } catch (parseError) {
        // Если не JSON, возвращаем как есть
        resolve({ success: true, output: stdout.trim() });
      }
    });
  });
}