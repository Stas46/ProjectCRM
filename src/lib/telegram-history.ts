/**
 * Telegram Chat History Manager
 * Управление историей диалогов для сохранения контекста
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface TelegramMessage {
  id?: string;
  user_id: string;
  telegram_id: number;
  telegram_chat_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type?: string;
  intent_action?: string;
  created_at?: string;
}

/**
 * Сохранить сообщение в историю
 */
export async function saveTelegramMessage(message: TelegramMessage): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('telegram_chat_history')
      .insert({
        user_id: message.user_id,
        telegram_id: message.telegram_id,
        telegram_chat_id: message.telegram_chat_id,
        role: message.role,
        content: message.content,
        message_type: message.message_type || 'text',
        intent_action: message.intent_action,
      });

    if (error) {
      console.error('❌ Error saving telegram message:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Exception saving telegram message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Получить историю диалога (последние N сообщений)
 */
export async function getTelegramHistory(
  telegramId: number,
  limit: number = 10
): Promise<{ data: TelegramMessage[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('telegram_chat_history')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching telegram history:', error);
      return { data: [], error: error.message };
    }

    // Возвращаем в хронологическом порядке (старые первыми)
    return { data: (data || []).reverse() };
  } catch (error: any) {
    console.error('❌ Exception fetching telegram history:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Очистить историю пользователя
 */
export async function clearTelegramHistory(telegramId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('telegram_chat_history')
      .delete()
      .eq('telegram_id', telegramId);

    if (error) {
      console.error('❌ Error clearing telegram history:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Exception clearing telegram history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Форматировать историю для передачи в AI
 */
export function formatHistoryForAI(history: TelegramMessage[]): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  return history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Сократить историю до разумного размера (для экономии токенов)
 */
export function trimHistory(history: TelegramMessage[], maxMessages: number = 10): TelegramMessage[] {
  if (history.length <= maxMessages) {
    return history;
  }

  // Всегда оставляем первое системное сообщение (если есть)
  const systemMessage = history.find(msg => msg.role === 'system');
  const otherMessages = history.filter(msg => msg.role !== 'system');

  // Берём последние N сообщений
  const recentMessages = otherMessages.slice(-maxMessages);

  return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
}
