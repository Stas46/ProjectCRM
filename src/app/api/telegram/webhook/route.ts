/**
 * Telegram Bot Webhook
 * Обрабатывает сообщения от Telegram
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDataAgent } from '@/lib/data-agent';
import {
  sendTelegramMessage,
  getUserIdByTelegramId,
  createLinkCode,
  formatForTelegram
} from '@/lib/telegram-helper';
import { getUserTasks, getUserProjects, getUserInvoices } from '@/lib/crm-data-tools';

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

    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text || '';
    const telegramId = message.from.id;
    const username = message.from.username;

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
    const { data: response } = await runDataAgent(userId, text);

    // Отправляем ответ
    const formattedResponse = formatForTelegram(response);
    await sendTelegramMessage(chatId, formattedResponse || 'Нет данных');

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

// GET для проверки статуса
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Telegram webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
}
