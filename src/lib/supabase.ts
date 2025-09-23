import { createClient } from '@supabase/supabase-js';

// Получаем URL и ключ из переменных окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Проверяем наличие URL и ключа
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Ошибка: Не заданы переменные окружения для Supabase');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'задан' : 'не задан');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'задан' : 'не задан');
}

// Создаем клиента Supabase с параметрами из переменных окружения
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Функция для проверки соединения
export async function checkConnection() {
  try {
    console.log('Проверка соединения с Supabase...');
    console.log('URL:', supabaseUrl);
    console.log('Ключ определён:', !!supabaseAnonKey);
    
    const { data, error } = await supabase.from('projects').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Ошибка подключения к Supabase:', error);
      return {
        success: false,
        error
      };
    }
    
    console.log('Успешное подключение к Supabase');
    return {
      success: true
    };
  } catch (err) {
    console.error('Исключение при подключении к Supabase:', err);
    return {
      success: false,
      error: err
    };
  }
}