import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Цены моделей ($ per 1M tokens)
const MODEL_PRICES: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o': { prompt: 2.5, completion: 10 },
  'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
  'gpt-4-turbo': { prompt: 10, completion: 30 },
  'gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 },
};

// Функция для загрузки файла в OpenAI Files API
async function uploadFileToOpenAI(fileUrl: string, fileName: string): Promise<string> {
  try {
    console.log('📤 Uploading file to OpenAI:', fileName);
    
    // Скачиваем файл с Supabase Storage
    const fileResponse = await fetch(fileUrl);
    const fileBuffer = await fileResponse.arrayBuffer();
    const blob = new Blob([fileBuffer]);
    
    // Создаём File объект
    const file = new File([blob], fileName, { 
      type: fileResponse.headers.get('content-type') || 'application/octet-stream' 
    });
    
    // Загружаем в OpenAI
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: 'assistants', // Для чтения и анализа документов
    });
    
    console.log('✅ File uploaded to OpenAI:', uploadedFile.id);
    return uploadedFile.id;
  } catch (error) {
    console.error('❌ Error uploading file to OpenAI:', error);
    throw error;
  }
}

// Функция для скачивания файла из OpenAI и загрузки в Supabase
async function downloadAndSaveFile(
  fileId: string, 
  userId: string,
  userEmail: string
): Promise<{ url: string; name: string }> {
  try {
    console.log('📥 Downloading file from OpenAI:', fileId);
    
    // Создаём сервисный клиент Supabase (обходит RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Получаем информацию о файле
    const fileInfo = await openai.files.retrieve(fileId);
    let fileName = fileInfo.filename || `output_${Date.now()}.txt`;
    
    console.log('🔍 Original filename from OpenAI:', fileName);
    
    // Если filename содержит путь (sandbox:/mnt/data/...), извлекаем только имя
    if (fileName.includes('/')) {
      const parts = fileName.split('/');
      fileName = parts[parts.length - 1]; // Берём последнюю часть пути
    }
    
    // Транслитерируем кириллицу в латиницу для сохранения читаемости
    const transliterate = (text: string): string => {
      const cyrillicMap: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
        ' ': '_', '%': 'percent'
      };
      
      return text.split('').map(char => cyrillicMap[char] || char).join('');
    };
    
    // Транслитерируем имя файла
    fileName = transliterate(fileName);
    
    // Если имя пустое или очень короткое после обработки, генерируем новое
    if (!fileName || fileName.length < 3) {
      fileName = `edited_document_${Date.now()}.docx`;
    }
    
    console.log('📄 Transliterated file name:', fileName);
    
    // Скачиваем содержимое файла
    const fileContent = await openai.files.content(fileId);
    const arrayBuffer = await fileContent.arrayBuffer();
    
    // Генерируем уникальное имя для Supabase
    const timestamp = Date.now();
    // Дополнительная очистка от оставшихся спецсимволов
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
    const storagePath = `${userId}/${timestamp}_${sanitizedName}`;
    
    console.log('💾 Storage path:', storagePath);
    
    // Загружаем в Supabase Storage с сервисным ключом (обходит RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('chat-files')
      .upload(storagePath, arrayBuffer, {
        contentType: fileInfo.bytes ? 'application/octet-stream' : 'text/plain',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Error uploading to Supabase:', uploadError);
      throw uploadError;
    }
    
    // Получаем публичный URL
    const { data: urlData } = supabaseAdmin.storage
      .from('chat-files')
      .getPublicUrl(storagePath);
    
    console.log('✅ File saved to Supabase:', urlData.publicUrl);
    
    return {
      url: urlData.publicUrl,
      name: sanitizedName
    };
  } catch (error) {
    console.error('❌ Error downloading file from OpenAI:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, model, history, attachments } = await req.json();

    if (!message || !model) {
      return NextResponse.json(
        { error: 'Message and model are required' },
        { status: 400 }
      );
    }

    // Получаем пользователя из токена
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    console.log('🔍 Auth token found:', !!accessToken);

    if (!accessToken) {
      console.error('❌ No access token in Authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - no token' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    console.log('👤 User:', user?.email, 'Error:', authError);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Формируем контекст из истории
    const messages = [
      {
        role: 'system' as const,
        content: 'Ты полезный AI-ассистент. Отвечай на русском языке, кратко и по делу. Если видишь изображения, описывай их подробно.',
      },
      ...(history || []).map((msg: any) => {
        // Если есть вложения с изображениями, добавляем их в контекст
        if (msg.attachments && msg.attachments.length > 0) {
          const imageAttachments = msg.attachments.filter((att: any) => 
            att.file_type.startsWith('image/')
          );
          
          if (imageAttachments.length > 0) {
            const content: any[] = [
              { type: 'text', text: msg.content }
            ];
            
            imageAttachments.forEach((att: any) => {
              content.push({
                type: 'image_url',
                image_url: {
                  url: att.file_url,
                  detail: 'high' // Высокое качество анализа
                }
              });
            });
            
            return {
              role: msg.role as 'user' | 'assistant',
              content: content
            };
          }
        }
        
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        };
      }),
    ];

    // Добавляем текущее сообщение пользователя
    const currentMessageContent: any[] = [
      { type: 'text', text: message }
    ];

    // Загружаем файлы в OpenAI и собираем file_ids
    const fileIds: string[] = [];
    
    if (attachments && attachments.length > 0) {
      const imageAttachments = attachments.filter((att: any) => 
        att.file_type.startsWith('image/')
      );
      
      const documentAttachments = attachments.filter((att: any) => 
        !att.file_type.startsWith('image/')
      );
      
      // Изображения добавляем в content как раньше
      imageAttachments.forEach((att: any) => {
        currentMessageContent.push({
          type: 'image_url',
          image_url: {
            url: att.file_url,
            detail: 'high'
          }
        });
      });
      
      // Документы загружаем в OpenAI Files API
      for (const doc of documentAttachments) {
        try {
          const fileId = await uploadFileToOpenAI(doc.file_url, doc.file_name);
          fileIds.push(fileId);
          
          // PDF → Responses API, DOCX → Assistants API
          if (doc.file_type === 'application/pdf') {
            console.log(`📎 PDF Document attached: ${doc.file_name} (${fileId})`);
          } else {
            console.log(`📎 DOCX Document attached: ${doc.file_name} (${fileId}) - will use Assistants API`);
          }
        } catch (error) {
          console.error(`❌ Failed to upload ${doc.file_name}:`, error);
        }
      }
    }

    messages.push({
      role: 'user' as const,
      content: currentMessageContent
    });

    // Сохраняем сообщение пользователя (используем Service Role для обхода RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: userMsgError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: 'user',
        content: message,
        model: model,
        tokens_prompt: 0,
        tokens_completion: 0,
        tokens_total: 0,
        cost_usd: 0,
        attachments: attachments || [],
      });

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
    }

    // Запрос к OpenAI
    // Используем Responses API если есть файлы, иначе Chat Completions
    let completion: any;
    let usage: any;
    let assistantMessage: string;
    
    if (fileIds.length > 0) {
      // Проверяем есть ли документы для редактирования (DOCX, XLSX, etc)
      const hasEditableDoc = attachments?.some((att: any) => 
        att.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        att.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        att.file_name?.match(/\.(docx|xlsx|pptx|csv|json|txt|py|js)$/i)
      );
      
      // Проверяем есть ли PDF файлы (для Responses API)
      const hasPdf = attachments?.some((att: any) => 
        att.file_type === 'application/pdf' || att.file_name?.endsWith('.pdf')
      );
      
      if (hasEditableDoc) {
        console.log('📝 Using Assistants API with Code Interpreter for document editing');
        
        // Создаём ассистента с возможностью редактирования файлов
        const assistant = await openai.beta.assistants.create({
          name: 'Document Editor',
          model: model,
          instructions: `Ты профессиональный AI-ассистент для работы с документами. 

КРИТИЧЕСКИ ВАЖНО - СОХРАНЕНИЕ ФОРМАТИРОВАНИЯ:
При редактировании документов используй библиотеку python-docx для ТОЧНОГО сохранения форматирования:

\`\`\`python
from docx import Document

# Открыть документ
doc = Document('input.docx')

# Редактировать ТОЛЬКО ТЕКСТ, не трогая стили и форматирование
for paragraph in doc.paragraphs:
    # Изменять только runs с сохранением font, bold, italic, size
    for run in paragraph.runs:
        if 'старый текст' in run.text:
            # Сохранить форматирование
            font = run.font
            run.text = run.text.replace('старый текст', 'новый текст')
            # Форматирование автоматически сохраняется

# Сохранить с исходным форматированием
doc.save('output.docx')
\`\`\`

ПРАВИЛА:
1. Используй python-docx для всех DOCX файлов
2. НЕ пересоздавай документ с нуля
3. Редактируй только текст, НЕ трогай:
   - Шрифты (font family, size)
   - Стили (bold, italic, underline)
   - Цвета текста и фона
   - Таблицы и их границы
   - Отступы и интервалы
   - Колонтитулы
4. Отвечай на русском языке
5. Объясняй что изменил`,
          tools: [
            { type: 'code_interpreter' },
            { type: 'file_search' }
          ],
        });
        
        // Создаём тред с прикрепленными файлами
        const thread = await openai.beta.threads.create({
          messages: [
            {
              role: 'user',
              content: message,
              attachments: fileIds.map(id => ({
                file_id: id,
                tools: [
                  { type: 'code_interpreter' as const },
                  { type: 'file_search' as const }
                ]
              }))
            }
          ]
        });
        
        // Запускаем с потоковой передачей для быстрого отклика
        console.log('🚀 Starting assistant run...');
        const stream = await openai.beta.threads.runs.stream(thread.id, {
          assistant_id: assistant.id,
        });
        
        let fullResponse = '';
        let outputFiles: string[] = [];
        
        // Обрабатываем поток событий
        for await (const event of stream) {
          if (event.event === 'thread.message.delta') {
            const delta = event.data.delta;
            if (delta.content) {
              for (const content of delta.content) {
                if (content.type === 'text' && content.text?.value) {
                  fullResponse += content.text.value;
                }
              }
            }
          }
          
          if (event.event === 'thread.run.completed') {
            const run = event.data;
            usage = run.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
            console.log('✅ Run completed');
          }
        }
        
        // Получаем список сообщений для проверки выходных файлов
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessages = messages.data.filter(m => m.role === 'assistant');
        
        console.log(`📨 Found ${assistantMessages.length} assistant messages`);
        
        if (assistantMessages.length > 0) {
          const lastMsg = assistantMessages[0];
          
          console.log('🔍 Message content types:', lastMsg.content.map(c => c.type));
          
          // Извлекаем текст и файлы
          for (const content of lastMsg.content) {
            // Image files
            if (content.type === 'image_file') {
              outputFiles.push(content.image_file.file_id);
              console.log('🖼️ Found image file:', content.image_file.file_id);
            }
            
            // Text с annotations (файлы из Code Interpreter)
            if (content.type === 'text') {
              if (!fullResponse) {
                fullResponse = content.text.value;
              }
              
              console.log(`📝 Text annotations count: ${content.text.annotations?.length || 0}`);
              
              // Извлекаем file_id из annotations
              if (content.text.annotations) {
                for (const annotation of content.text.annotations) {
                  console.log('🔖 Annotation type:', annotation.type);
                  
                  if (annotation.type === 'file_path') {
                    const fileId = annotation.file_path.file_id;
                    if (!outputFiles.includes(fileId)) {
                      outputFiles.push(fileId);
                      console.log('📎 Found output file in annotation:', fileId);
                    }
                  }
                }
              }
            }
          }
        }
        
        console.log(`📦 Total output files found: ${outputFiles.length}`);
        
        assistantMessage = fullResponse || 'Документ обработан';
        
        // Если есть выходные файлы, скачиваем и сохраняем их
        if (outputFiles.length > 0) {
          console.log(`📦 Processing ${outputFiles.length} output files...`);
          assistantMessage += '\n\n📎 **Созданные файлы:**\n';
          
          for (const fileId of outputFiles) {
            try {
              // Скачиваем файл из OpenAI и загружаем в Supabase
              const savedFile = await downloadAndSaveFile(fileId, user.id, user.email || 'anonymous');
              assistantMessage += `- [${savedFile.name}](${savedFile.url}) ⬇️ Скачать\n`;
              
              console.log('✅ File downloaded and saved:', savedFile.name);
            } catch (err) {
              console.error('Error downloading file:', err);
              try {
                const fileInfo = await openai.files.retrieve(fileId);
                assistantMessage += `- ${fileInfo.filename} (ошибка загрузки)\n`;
              } catch {
                assistantMessage += `- Файл ${fileId} (ошибка загрузки)\n`;
              }
            }
          }
        }
        
        // Удаляем временного ассистента
        await openai.beta.assistants.delete(assistant.id);
        
      } else if (hasPdf) {
        console.log('🔄 Using Responses API with file attachments');
        
        // Формируем input для Responses API (только для PDF)
        const inputContent: any[] = [
          { type: 'input_text', text: message }
        ];
        
        // Добавляем изображения
        if (attachments) {
          const imageAttachments = attachments.filter((att: any) => 
            att.file_type.startsWith('image/')
          );
          imageAttachments.forEach((att: any) => {
            inputContent.push({
              type: 'input_image',
              image_url: att.file_url
            });
          });
        }
        
        // Добавляем только PDF документы
        const pdfFileIds = fileIds.filter((_, idx) => {
          const doc = attachments?.filter((a: any) => !a.file_type.startsWith('image/'))[idx];
          return doc?.file_type === 'application/pdf' || doc?.file_name?.endsWith('.pdf');
        });
        
        pdfFileIds.forEach(fileId => {
          inputContent.push({
            type: 'input_file',
            file_id: fileId
          });
        });
        
        // Вызываем Responses API
        const response = await openai.responses.create({
          model: model,
          input: [
            {
              role: 'user',
              content: inputContent
            }
          ],
        });
        
        // Извлекаем текст из ответа
        const outputItem = response.output?.[0];
        if (outputItem && 'content' in outputItem) {
          const textContent = outputItem.content?.find((c: any) => c.type === 'output_text');
          assistantMessage = (textContent as any)?.text || 'Ошибка ответа';
        } else {
          assistantMessage = 'Ошибка ответа';
        }
        
        usage = response.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
        
        // Преобразуем формат usage из Responses API в Chat Completions формат
        usage = {
          prompt_tokens: usage.input_tokens || 0,
          completion_tokens: usage.output_tokens || 0,
          total_tokens: usage.total_tokens || 0
        };
      } else {
        // Если нет файлов для обработки
        assistantMessage = 'Нет файлов для обработки';
        usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      }
      
    } else {
      console.log('🔄 Using Chat Completions API');
      
      // Используем обычный Chat Completions
      completion = await openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      assistantMessage = completion.choices[0]?.message?.content || 'Ошибка ответа';
      usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    }

    // Рассчитываем стоимость
    const prices = MODEL_PRICES[model] || { prompt: 0, completion: 0 };
    const costPrompt = (usage.prompt_tokens / 1_000_000) * prices.prompt;
    const costCompletion = (usage.completion_tokens / 1_000_000) * prices.completion;
    const totalCost = costPrompt + costCompletion;

    // Сохраняем ответ ассистента
    const { error: assistantMsgError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: 'assistant',
        content: assistantMessage,
        model: model,
        tokens_prompt: usage.prompt_tokens,
        tokens_completion: usage.completion_tokens,
        tokens_total: usage.total_tokens,
        cost_usd: totalCost,
      });

    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError);
    }

    return NextResponse.json({
      message: assistantMessage,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost: {
        prompt: costPrompt,
        completion: costCompletion,
        total: totalCost,
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
