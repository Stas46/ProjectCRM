const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fpnugtlchxigwpqwiczc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwbnVndGxjaHhpZ3dwcXdpY3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjM1NjYsImV4cCI6MjA3NDEzOTU2Nn0.AjViW2H-vrSfvlWboMMvctzuy8d4wFLfGymX59fhPZk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  try {
    // Делаем простой SELECT, чтобы увидеть структуру данных
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Ошибка при получении данных:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('Структура таблицы projects (колонки):', Object.keys(data[0]));
    } else {
      // Если таблица пустая, попробуем вставить тестовую запись
      const { data: insertData, error: insertError } = await supabase
        .from('projects')
        .insert({
          title: 'Test Project',
          description: 'Test Description',
          client_name: 'Test Client',
          address: 'Test Address',
          status: 'planning'
        })
        .select();

      if (insertError) {
        console.error('Ошибка при вставке тестовых данных:', insertError);
      } else {
        console.log('Структура таблицы projects (из вставки):', Object.keys(insertData[0]));
      }
    }

  } catch (error) {
    console.error('Общая ошибка:', error);
  }
}

checkColumns();