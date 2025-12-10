/**
 * Telegram Bot Webhook
 * Обрабатывает сообщения от Telegram
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { runDataAgent } from '@/lib/data-agent';
import { runPersonalAssistant } from '@/lib/personal-assistant-agent';
import {
  sendTelegramMessage,
  sendTelegramDocument,
  getUserIdByTelegramId,
  createLinkCode,
  formatForTelegram
} from '@/lib/telegram-helper';
import {
  saveTelegramMessage,
  getTelegramHistory,
  clearTelegramHistory,
  formatHistoryForAI,
  trimHistory
} from '@/lib/telegram-history';
import { getUserTasks, getUserProjects, getUserInvoices } from '@/lib/crm-data-tools';

// Инициализация OpenAI для Whisper
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Хранилище режимов пользователей (в production использовать Redis/БД)
const userModes = new Map<number, 'ai' | 'crm' | 'hybrid'>();

// Получить режим пользователя (по умолчанию hybrid)
function getUserMode(telegramId: number): 'ai' | 'crm' | 'hybrid' {
  return userModes.get(telegramId) || 'hybrid';
}

// Установить режим пользователя
function setUserMode(telegramId: number, mode: 'ai' | 'crm' | 'hybrid') {
  userModes.set(telegramId, mode);
}

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
  };
  audio?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    horizontal_accuracy?: number;
    live_period?: number;
  };
  date: number;
}

interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  message?: {
    message_id: number;
    chat: {
      id: number;
    };
  };
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();
    
    console.log('📱 Telegram webhook:', JSON.stringify(update, null, 2));

    // Обработка callback query (нажатия на кнопки)
    if (update.callback_query) {
      // Не ждём, обрабатываем асинхронно
      handleCallbackQuery(update.callback_query).catch(err => 
        console.error('Callback query error:', err)
      );
      return NextResponse.json({ ok: true });
    }

    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const username = message.from.username;

    // Быстро отвечаем Telegram что запрос принят
    // А обработку делаем асинхронно в фоне
    processMessageAsync(message, chatId, telegramId, username).catch(err =>
      console.error('Message processing error:', err)
    );

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('❌ Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * Асинхронная обработка сообщения (не блокирует ответ Telegram)
 */
async function processMessageAsync(
  message: TelegramMessage,
  chatId: number,
  telegramId: number,
  username?: string
) {
  let text = message.text || '';

  // Обработка голосовых сообщений
  if (message.voice || message.audio) {
    const fileId = message.voice?.file_id || message.audio?.file_id;
    if (fileId) {
      try {
        console.log('🎤 Processing voice message:', fileId);
        text = await transcribeVoiceMessage(fileId);
        console.log('📝 Transcribed text:', text);
        
        // Уведомляем пользователя что голос распознан
        await sendTelegramMessage(chatId, `🎤 _Распознано:_ ${text}`);
      } catch (error) {
        console.error('❌ Voice transcription error:', error);
        await sendTelegramMessage(
          chatId,
          '❌ Не удалось распознать голосовое сообщение. Попробуйте написать текстом.'
        );
        return;
      }
    }
  }

  // Обработка геолокации
  if (message.location) {
    await handleLocation(chatId, telegramId, message.location);
    return;
  }

  if (!text) {
    return;
  }

  // Обработка команд
  if (text.startsWith('/')) {
    await handleCommand(chatId, telegramId, text, username);
    return;
  }

  // Команда /clear - очистить историю диалога
  if (text === '/clear') {
    const { success } = await clearTelegramHistory(telegramId);
    
    if (success) {
      await sendTelegramMessage(chatId, '🗑️ История диалога очищена. Начнём с чистого листа!');
    } else {
      await sendTelegramMessage(chatId, '⚠️ Не удалось очистить историю. Попробуйте позже.');
    }
    return;
  }

  // Обработка обычного сообщения через Data Agent
  const userId = await getUserIdByTelegramId(telegramId);
  
  if (!userId) {
    await sendTelegramMessage(
      chatId,
      '❌ Ваш Telegram не привязан к аккаунту CRM.\n\nОтправьте /start для получения кода привязки.'
    );
    return;
  }

  // Получаем текущий режим пользователя
  const currentMode = getUserMode(telegramId);
  console.log(`🎯 User mode: ${currentMode}`);

  // Сохраняем telegram_chat_id для напоминаний
  const { saveContext } = await import('@/lib/personal-data-tools');
  await saveContext(userId, 'fact', 'telegram_chat_id', chatId);

  // Показываем индикатор набора текста
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' })
  });

  // Получаем историю диалога
  const { data: history } = await getTelegramHistory(telegramId, 10);
  
  // Сохраняем сообщение пользователя в историю
  await saveTelegramMessage({
    user_id: userId,
    telegram_id: telegramId,
    telegram_chat_id: chatId,
    role: 'user',
    content: text,
    message_type: message.voice || message.audio ? 'voice' : 'text'
  });

  let finalResponse = '';
  let intentAction: string | undefined;

  // Режим AI - только DeepSeek без CRM
  if (currentMode === 'ai') {
    // Передаём историю в AI
    const historyMessages = formatHistoryForAI(trimHistory(history, 8));
    finalResponse = await getAIResponse(text, historyMessages);
  }
  // Режим CRM - только данные из CRM
  else if (currentMode === 'crm') {
    const { data: dataResponse } = await runDataAgent(userId, text);
    finalResponse = dataResponse || 'Нет данных в CRM по вашему запросу.';
  }
  // Гибридный режим - Personal Assistant (CRM + личное + погода)
  else {
    try {
      console.log('🤖 Running Personal Assistant for:', text);
      console.log('📚 History context:', history.length, 'messages');
      
      // Преобразуем историю для Personal Assistant
      const historyMessages = formatHistoryForAI(trimHistory(history, 8));
      
      // Используем Personal Assistant который объединяет всё
      const { data: assistantResponse, intent, sessionId } = await runPersonalAssistant(userId, text, historyMessages);
      
      // Сохраняем какое действие было распознано
      intentAction = intent.action;
      
      console.log('📊 Personal Assistant Result:', {
        sessionId,
        action: intent.action,
        reasoning: intent.reasoning,
        responseLength: assistantResponse?.length || 0,
        hasProactiveQuestion: !!intent.proactive_question
      });
      
      if (assistantResponse && assistantResponse !== 'Нет данных') {
        console.log('✅ Personal Assistant response:', assistantResponse.substring(0, 200));
        finalResponse = assistantResponse;
      } else {
        console.log('⚠️ Personal Assistant returned empty, falling back to AI');
        // Фоллбэк на обычный AI если ассистент не смог помочь
        const historyMessages = formatHistoryForAI(trimHistory(history, 8));
        finalResponse = await getAIResponse(text, historyMessages);
      }
    } catch (error) {
      console.error('❌ Personal Assistant error:', error);
      // Фоллбэк на старый Data Agent
      const { data: dataResponse } = await runDataAgent(userId, text);
      
      if (dataResponse && dataResponse !== 'Нет данных') {
        finalResponse = dataResponse;
      } else {
        const historyMessages = formatHistoryForAI(trimHistory(history, 8));
        finalResponse = await getAIResponse(text, historyMessages);
      }
    }
  }

  // Проверяем нужно ли отправить файл
  if (finalResponse.startsWith('__SEND_FILE__:')) {
    const parts = finalResponse.split(':');
    const invoiceId = parts[1];
    const invoiceNumber = parts[2] || 'счёт';
    
    console.log('📄 Sending file for invoice:', { invoiceId, invoiceNumber });
    
    // Получаем URL файла из Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('file_url, file_name')
      .eq('id', invoiceId)
      .single();
    
    console.log('📋 Invoice data from DB:', { 
      invoice, 
      error: fetchError?.message,
      hasFileUrl: !!invoice?.file_url 
    });
    
    if (invoice?.file_url) {
      // Отправляем файл
      console.log('📤 Sending document:', invoice.file_url);
      await sendTelegramDocument(chatId, invoice.file_url, `📄 Счёт ${invoiceNumber}`);
      
      // Сохраняем в историю что отправили файл
      await saveTelegramMessage({
        user_id: userId,
        telegram_id: telegramId,
        telegram_chat_id: chatId,
        role: 'assistant',
        content: `Отправил файл счёта ${invoiceNumber}`,
        message_type: 'document',
        intent_action: 'send_invoice_file'
      });
      
      console.log('✅ Invoice file sent successfully');
      return;
    } else {
      console.error('❌ No file_url found for invoice:', { invoiceId, invoice, fetchError });
      finalResponse = `❌ Файл счёта ${invoiceNumber} не найден в системе`;
    }
  }

  // Сохраняем ответ бота в историю
  await saveTelegramMessage({
    user_id: userId,
    telegram_id: telegramId,
    telegram_chat_id: chatId,
    role: 'assistant',
    content: finalResponse,
    message_type: 'text',
    intent_action: intentAction
  });

  // Отправляем ответ
  console.log('📤 Sending to Telegram:', {
    chatId,
    responseLength: finalResponse.length,
    preview: finalResponse.substring(0, 100)
  });
  
  const formattedResponse = formatForTelegram(finalResponse);
  await sendTelegramMessage(chatId, formattedResponse || 'Не удалось получить ответ');

  console.log('✅ Message sent successfully');
}
/**
 * Обработка геолокации от пользователя
 */
async function handleLocation(
  chatId: number, 
  telegramId: number, 
  location: { latitude: number; longitude: number; live_period?: number }
) {
  const userId = await getUserIdByTelegramId(telegramId);
  
  if (!userId) {
    await sendTelegramMessage(
      chatId,
      '❌ Ваш Telegram не привязан к аккаунту CRM.\n\nОтправьте /start для получения кода привязки.'
    );
    return;
  }

  const { latitude, longitude, live_period } = location;
  const isLive = !!live_period;

  try {
    // Reverse geocoding - получаем адрес по координатам
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ru`;
    
    const geoResponse = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'GlazingCRM/1.0' }
    });
    
    let address = 'Неизвестный адрес';
    let displayName = '';
    
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      displayName = geoData.display_name || '';
      address = geoData.address ? 
        `${geoData.address.road || ''} ${geoData.address.house_number || ''}, ${geoData.address.city || geoData.address.town || geoData.address.village || ''}`.trim() :
        displayName;
    }

    // Сохраняем текущую позицию в контекст
    const { saveContext } = await import('@/lib/personal-data-tools');
    await saveContext(userId, 'fact', 'current_location', { 
      latitude, 
      longitude, 
      address,
      displayName,
      isLive,
      updatedAt: new Date().toISOString()
    });

    // Формируем ответ
    const locationEmoji = isLive ? '📍🔴' : '📍';
    const liveText = isLive ? ' (транслируется в реальном времени)' : '';
    
    const responseText = `${locationEmoji} *Получил твою геопозицию!*${liveText}

📍 *Координаты:* \`${latitude.toFixed(6)}, ${longitude.toFixed(6)}\`
🏠 *Адрес:* ${address}

✅ Сохранил как текущее местоположение. Теперь могу:
• Построить маршрут от твоей позиции
• Показать погоду в этом месте
• Найти ближайшие места

_Напиши, например: "погода здесь" или "как добраться до Невского проспекта"_`;

    await sendTelegramMessage(chatId, responseText);
    
  } catch (error) {
    console.error('❌ Error handling location:', error);
    await sendTelegramMessage(
      chatId,
      `📍 Получил координаты: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\n⚠️ Не удалось определить адрес, но координаты сохранены.`
    );
  }
}

/**
 * Отправить меню выбора режима с inline кнопками
 */
async function sendModeSelectionMenu(chatId: number, currentMode: 'ai' | 'crm' | 'hybrid') {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  const modeMarkers = {
    ai: currentMode === 'ai' ? '✅ ' : '',
    crm: currentMode === 'crm' ? '✅ ' : '',
    hybrid: currentMode === 'hybrid' ? '✅ ' : ''
  };

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `⚙️ *Выберите режим работы:*\n\n` +
            `🤖 *AI режим* - Общение с искусственным интеллектом на любые темы\n\n` +
            `📋 *CRM режим* - Работа только с задачами, проектами и счетами\n\n` +
            `🔄 *Гибридный* - Сначала поиск в CRM, если не найдено - ответ AI`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: `${modeMarkers.ai}🤖 AI`, callback_data: 'mode_ai' }
          ],
          [
            { text: `${modeMarkers.crm}📋 CRM`, callback_data: 'mode_crm' }
          ],
          [
            { text: `${modeMarkers.hybrid}🔄 Гибридный`, callback_data: 'mode_hybrid' }
          ]
        ]
      }
    })
  });
}

/**
 * Получить ответ от AI (DeepSeek) без CRM данных
 */
async function getAIResponse(text: string, historyMessages: any[] = []): Promise<string> {
  try {
    const messages = [
      {
        role: 'system',
        content: `Ты умный AI-ассистент в Telegram. 
Отвечай кратко, дружелюбно и полезно.
Используй эмодзи умеренно.
Отвечай на русском языке.`
      },
      ...historyMessages,
      {
        role: 'user',
        content: text
      }
    ];

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Не удалось получить ответ от AI';
  } catch (error) {
    console.error('❌ AI response error:', error);
    return 'Произошла ошибка при обращении к AI';
  }
}

/**
 * Обработка нажатий на inline кнопки
 */
async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const telegramId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const data = callbackQuery.data;

  if (!chatId || !data) return;

  // Обработка переключения режима
  if (data.startsWith('mode_')) {
    const mode = data.replace('mode_', '') as 'ai' | 'crm' | 'hybrid';
    setUserMode(telegramId, mode);

    const modeNames = {
      ai: '🤖 AI режим',
      crm: '📋 CRM режим',
      hybrid: '🔄 Гибридный режим'
    };

    const modeDescriptions = {
      ai: 'Только общение с AI, без доступа к CRM',
      crm: 'Только работа с задачами, проектами и счетами',
      hybrid: 'Сначала поиск в CRM, затем AI если нет данных'
    };

    // Отправляем подтверждение
    await sendTelegramMessage(
      chatId,
      `✅ Выбран *${modeNames[mode]}*\n\n${modeDescriptions[mode]}`
    );

    // Подтверждаем callback (убирает "часики" на кнопке)
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: `Режим изменён на: ${modeNames[mode]}`
      })
    });
  }
}

/**
 * Обработка команд бота
 */
async function handleCommand(
  chatId: number,
  telegramId: number,
  command: string,
  username?: string
) {
  try {
    console.log(`🤖 Handling command: ${command} from ${telegramId}`);
    const cmd = command.split(' ')[0].toLowerCase();

  switch (cmd) {
    case '/start': {
      // Создать код привязки
      const code = await createLinkCode(telegramId, username);
      await sendTelegramMessage(
        chatId,
        `👋 Привет! Я бот CRM Stella.\n\n` +
        `🔑 Ваш код привязки: *${code}*\n\n` +
        `Откройте веб-версию CRM, зайдите в Профиль и введите этот код.\n\n` +
        `⏰ Код действителен 10 минут.`
      );
      break;
    }

    case '/help': {
      const currentMode = getUserMode(telegramId);
      const modeEmoji = currentMode === 'ai' ? '🤖' : currentMode === 'crm' ? '📋' : '🔄';
      
      await sendTelegramMessage(
        chatId,
        `📋 *Доступные команды:*\n\n` +
        `/start - Получить код привязки\n` +
        `/mode - Переключить режим работы ${modeEmoji}\n` +
        `/tasks - Показать мои задачи\n` +
        `/projects - Показать проекты\n` +
        `/invoices - Показать счета\n` +
        `/help - Эта справка\n\n` +
        `💬 *Или просто пишите как в чате:*\n` +
        `• "какие задачи на сегодня?"\n` +
        `• "создай важную задачу купить крышки"\n` +
        `• "переместить в квадрант 1"\n` +
        `• "покажи проекты"\n\n` +
        `🎤 *Также поддерживаются голосовые сообщения!*`
      );
      break;
    }

    case '/mode': {
      // Отправляем меню выбора режима с inline кнопками
      const currentMode = getUserMode(telegramId);
      await sendModeSelectionMenu(chatId, currentMode);
      break;
    }

    case '/tasks': {
      const userId = await getUserIdByTelegramId(telegramId);
      if (!userId) {
        await sendTelegramMessage(chatId, '❌ Сначала привяжите аккаунт через /start');
        return;
      }

      const { data: tasks } = await getUserTasks(userId, { limit: 10 });
      if (!tasks || tasks.length === 0) {
        await sendTelegramMessage(chatId, '📋 У вас нет задач');
        return;
      }

      const taskList = tasks.map((t: any, i: number) => {
        const quadrant = t.priority === 1 && t.status === 'in_progress' ? '🔥 UV' 
          : t.priority === 1 && t.status === 'todo' ? '⭐ V'
          : t.priority === 2 && t.status === 'in_progress' ? '⚡ U'
          : '📋 O';
        return `${i + 1}. ${t.title} ${quadrant}`;
      }).join('\n');

      await sendTelegramMessage(chatId, `📋 *Ваши задачи:*\n\n${taskList}`);
      break;
    }

    case '/projects': {
      const userId = await getUserIdByTelegramId(telegramId);
      if (!userId) {
        await sendTelegramMessage(chatId, '❌ Сначала привяжите аккаунт через /start');
        return;
      }

      const { data: projects } = await getUserProjects(userId, { limit: 10 });
      if (!projects || projects.length === 0) {
        await sendTelegramMessage(chatId, '📁 Нет проектов');
        return;
      }

      const projectList = projects.map((p: any, i: number) => {
        const name = p.project_name || p.client_name || p.title || `Проект #${p.project_number || i + 1}`;
        const status = p.status === 'active' ? '🟢' : p.status === 'completed' ? '✅' : p.status === 'cancelled' ? '❌' : '⏸️';
        return `${i + 1}. ${status} ${name}`;
      }).join('\n');

      await sendTelegramMessage(chatId, `📁 *Ваши проекты:*\n\n${projectList}`);
      break;
    }

    case '/invoices': {
      const userId = await getUserIdByTelegramId(telegramId);
      if (!userId) {
        await sendTelegramMessage(chatId, '❌ Сначала привяжите аккаунт через /start');
        return;
      }

      const { data: invoices } = await getUserInvoices(userId, { limit: 10 });
      if (!invoices || invoices.length === 0) {
        await sendTelegramMessage(chatId, '💰 Нет счетов');
        return;
      }

      const invoiceList = invoices.map((inv: any, i: number) => 
        `${i + 1}. ${inv.invoice_number} - ${inv.total_amount || 0} ₽`
      ).join('\n');

      await sendTelegramMessage(chatId, `💰 *Ваши счета:*\n\n${invoiceList}`);
      break;
    }

    default: {
      await sendTelegramMessage(chatId, 'Неизвестная команда. Используйте /help');
    }
  }
  } catch (error: any) {
    console.error('❌ Error in handleCommand:', error);
    await sendTelegramMessage(chatId, '❌ Произошла ошибка при выполнении команды. Попробуйте позже.');
  }
}

/**
 * Транскрибация голосового сообщения через OpenAI Whisper
 */
async function transcribeVoiceMessage(fileId: string): Promise<string> {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  // 1. Получить информацию о файле
  const fileInfoResponse = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const fileInfo = await fileInfoResponse.json();
  
  if (!fileInfo.ok) {
    throw new Error('Failed to get file info from Telegram');
  }

  const filePath = fileInfo.result.file_path;
  
  // 2. Скачать файл
  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const audioResponse = await fetch(fileUrl);
  const audioBlob = await audioResponse.blob();
  
  // 3. Конвертировать в File для OpenAI
  const audioFile = new File([audioBlob], 'voice.ogg', { type: 'audio/ogg' });
  
  // 4. Отправить в Whisper API
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'ru', // Указываем русский язык для лучшего распознавания
  });

  return transcription.text;
}

// GET для проверки статуса
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Telegram webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
}
