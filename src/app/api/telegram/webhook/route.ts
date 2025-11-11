/**
 * Telegram Bot Webhook
 * Обрабатывает сообщения от Telegram
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { runDataAgent } from '@/lib/data-agent';
import {
  sendTelegramMessage,
  getUserIdByTelegramId,
  createLinkCode,
  formatForTelegram
} from '@/lib/telegram-helper';
import { getUserTasks, getUserProjects, getUserInvoices } from '@/lib/crm-data-tools';

// Инициализация OpenAI для Whisper
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();
    
    console.log('📱 Telegram webhook:', JSON.stringify(update, null, 2));

    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const username = message.from.username;

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
          return NextResponse.json({ ok: true });
        }
      }
    }

    if (!text) {
      return NextResponse.json({ ok: true });
    }

    // Обработка команд
    if (text.startsWith('/')) {
      await handleCommand(chatId, telegramId, text, username);
      return NextResponse.json({ ok: true });
    }

    // Обработка обычного сообщения через Data Agent
    const userId = await getUserIdByTelegramId(telegramId);
    
    if (!userId) {
      await sendTelegramMessage(
        chatId,
        '❌ Ваш Telegram не привязан к аккаунту CRM.\n\nОтправьте /start для получения кода привязки.'
      );
      return NextResponse.json({ ok: true });
    }

    // Запускаем Data Agent
    console.log(`🤖 Running Data Agent for user ${userId}`);
    const { data: dataResponse, intent } = await runDataAgent(userId, text);

    // Форматируем ответ в разговорном стиле через DeepSeek
    let finalResponse = dataResponse;
    
    // Если это был запрос данных, делаем ответ более разговорным
    if (intent && dataResponse) {
      try {
        const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: `Ты личный ассистент в CRM системе для Telegram. 
Отвечай кратко, дружелюбно и по-человечески.
Используй эмодзи умеренно.
Если нужно показать список - используй четкую структуру.
Не повторяй вопрос пользователя.`
              },
              {
                role: 'user',
                content: `Пользователь спросил: "${text}"\n\nДанные из CRM:\n${dataResponse}\n\nСформулируй ответ в разговорном стиле на русском языке.`
              }
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        const deepseekData = await deepseekResponse.json();
        if (deepseekData.choices && deepseekData.choices[0]?.message?.content) {
          finalResponse = deepseekData.choices[0].message.content;
        }
      } catch (error) {
        console.error('❌ DeepSeek formatting error:', error);
        // Используем оригинальный ответ если DeepSeek недоступен
      }
    }

    // Отправляем ответ
    const formattedResponse = formatForTelegram(finalResponse);
    await sendTelegramMessage(chatId, formattedResponse || 'Не удалось получить ответ');

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('❌ Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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
      await sendTelegramMessage(
        chatId,
        `📋 *Доступные команды:*\n\n` +
        `/start - Получить код привязки\n` +
        `/tasks - Показать мои задачи\n` +
        `/projects - Показать проекты\n` +
        `/invoices - Показать счета\n` +
        `/help - Эта справка\n\n` +
        `💬 *Или просто пишите как в чате:*\n` +
        `• "какие задачи на сегодня?"\n` +
        `• "создай важную задачу купить крышки"\n` +
        `• "переместить в квадрант 1"\n` +
        `• "покажи проекты"`
      );
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

      const projectList = projects.map((p: any, i: number) => 
        `${i + 1}. ${p.client_name || p.project_name || 'Без названия'}`
      ).join('\n');

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
