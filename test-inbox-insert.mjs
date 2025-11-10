import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInboxInsert() {
  console.log('\n🧪 Тестируем создание задачи в Inbox (project_id = null)...\n');
  
  const taskData = {
    title: 'TEST - Inbox Task ' + Date.now(),
    description: 'Тестовая задача для Inbox',
    priority: 2,
    status: 'todo',
    project_id: null,
    created_at: new Date().toISOString(),
  };
  
  console.log('Данные для вставки:', taskData);
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select();
  
  if (error) {
    console.log('\n❌ ОШИБКА:');
    console.log('  Code:', error.code);
    console.log('  Message:', error.message);
    console.log('  Details:', error.details);
    console.log('  Hint:', error.hint);
    
    if (error.code === '23502') {
      console.log('\n🔍 Это ограничение NOT NULL.');
      console.log('📝 Выполни в Supabase SQL Editor:');
      console.log('   ALTER TABLE tasks ALTER COLUMN project_id DROP NOT NULL;');
    } else if (error.code === '42501') {
      console.log('\n🔍 Это ошибка RLS (Row Level Security).');
      console.log('📝 Проверь политики RLS для таблицы tasks');
    }
  } else {
    console.log('\n✅ УСПЕХ! Задача создана:');
    console.log('  ID:', data[0].id);
    console.log('  Title:', data[0].title);
    console.log('  project_id:', data[0].project_id);
    
    // Проверим что можем её прочитать
    const { data: readData } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', data[0].id)
      .single();
    
    if (readData) {
      console.log('\n✅ Задача успешно читается обратно');
      
      // Удалим тестовую задачу
      await supabase.from('tasks').delete().eq('id', data[0].id);
      console.log('✅ Тестовая задача удалена');
    }
  }
}

testInboxInsert();
