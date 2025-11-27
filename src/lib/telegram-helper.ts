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
    console.log(`📤 Sending Telegram message to ${chatId}: ${text.substring(0, 50)}...`);
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

    const result = await response.json();
    console.log(`✅ Message sent successfully to ${chatId}`);
    return { success: true, data: result };
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

  // Удаляем старые коды этого пользователя
  await supabase
    .from('telegram_link_codes')
    .delete()
    .eq('telegram_id', telegramId);

  // Создаем новый код в отдельной таблице
  await supabase
    .from('telegram_link_codes')
    .insert({
      telegram_id: telegramId,
      telegram_username: telegramUsername,
      link_code: code,
      expires_at: expiresAt.toISOString()
    });

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

  // Найти код в таблице telegram_link_codes
  const { data: linkData, error: findError } = await supabase
    .from('telegram_link_codes')
    .select('telegram_id, telegram_username, expires_at')
    .eq('link_code', code)
    .single();

  if (findError || !linkData) {
    console.error('❌ Link code not found:', findError);
    return { success: false, error: 'Код не найден или истек' };
  }

  // Проверить что код не истек
  const expiresAt = new Date(linkData.expires_at);
  if (expiresAt < new Date()) {
    return { success: false, error: 'Код истек. Отправьте /start боту снова.' };
  }

  // Проверить что этот telegram_id еще не привязан к другому пользователю
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', linkData.telegram_id)
    .single();

  if (existingProfile && existingProfile.id !== userId) {
    return { success: false, error: 'Этот Telegram уже привязан к другому аккаунту' };
  }

  // Обновить профиль пользователя
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      telegram_id: linkData.telegram_id,
      telegram_username: linkData.telegram_username
    })
    .eq('id', userId);

  if (updateError) {
    console.error('❌ Error linking Telegram:', updateError);
    return { success: false, error: 'Ошибка привязки' };
  }

  // Удалить использованный код
  await supabase
    .from('telegram_link_codes')
    .delete()
    .eq('link_code', code);

  return { 
    success: true, 
    telegram_id: linkData.telegram_id,
    telegram_username: linkData.telegram_username
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
