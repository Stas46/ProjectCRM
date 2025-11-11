/**
 * Telegram Bot Helper
 * Утилиты для работы с Telegram Bot API
 */

import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

// Создаем клиент Supabase с service role для доступа к profiles
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Отправить сообщение в Telegram
 */
export async function sendTelegramMessage(chatId: number, text: string, options?: any) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Telegram API error:', error);
      return { success: false, error };
    }

    return { success: true, data: await response.json() };
  } catch (error: any) {
    console.error('❌ Error sending Telegram message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Получить user_id по telegram_id
 */
export async function getUserIdByTelegramId(telegramId: number): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  if (error || !data) {
    console.error('❌ User not found for telegram_id:', telegramId);
    return null;
  }

  return data.id;
}

/**
 * Сгенерировать код привязки (6 цифр)
 */
export function generateLinkCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Создать код привязки для пользователя Telegram
 */
export async function createLinkCode(telegramId: number, telegramUsername?: string): Promise<string> {
  const supabase = getSupabaseServiceClient();
  const code = generateLinkCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

  // Создаем временную запись с кодом
  // Если пользователь уже есть - обновляем код
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  if (existing) {
    // Обновляем существующего пользователя
    await supabase
      .from('profiles')
      .update({
        telegram_link_code: code,
        telegram_link_code_expires_at: expiresAt.toISOString(),
        telegram_username: telegramUsername
      })
      .eq('telegram_id', telegramId);
  } else {
    // Создаем временную запись (будет обновлена при привязке)
    // Пока не знаем user_id, но храним код для последующей привязки
    await supabase
      .from('profiles')
      .insert({
        telegram_id: telegramId,
        telegram_username: telegramUsername,
        telegram_link_code: code,
        telegram_link_code_expires_at: expiresAt.toISOString()
      });
  }

  return code;
}

/**
 * Привязать Telegram ID к существующему пользователю по коду
 */
export async function linkTelegramByCode(
  code: string,
  userId: string
): Promise<{ success: boolean; error?: string; telegram_id?: number; telegram_username?: string }> {
  const supabase = getSupabaseServiceClient();

  // Найти запись с таким кодом
  const { data: tempProfile, error: findError } = await supabase
    .from('profiles')
    .select('telegram_id, telegram_username, telegram_link_code_expires_at')
    .eq('telegram_link_code', code)
    .single();

  if (findError || !tempProfile) {
    return { success: false, error: 'Код не найден или истек' };
  }

  // Проверить что код не истек
  const expiresAt = new Date(tempProfile.telegram_link_code_expires_at);
  if (expiresAt < new Date()) {
    return { success: false, error: 'Код истек. Отправьте /start боту снова.' };
  }

  // Обновить профиль пользователя
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      telegram_id: tempProfile.telegram_id,
      telegram_username: tempProfile.telegram_username,
      telegram_link_code: null,
      telegram_link_code_expires_at: null
    })
    .eq('id', userId);

  if (updateError) {
    console.error('❌ Error linking Telegram:', updateError);
    return { success: false, error: 'Ошибка привязки' };
  }

  // Удалить временную запись если она была
  await supabase
    .from('profiles')
    .delete()
    .eq('telegram_link_code', code)
    .neq('id', userId);

  return { 
    success: true, 
    telegram_id: tempProfile.telegram_id,
    telegram_username: tempProfile.telegram_username
  };
}/**
 * Форматировать текст для Telegram Markdown
 */
export function formatForTelegram(text: string): string {
  // Заменить ** на * для Telegram
  return text
    .replace(/\*\*(.*?)\*\*/g, '*$1*')
    .replace(/### /g, '')
    .replace(/## /g, '');
}
