import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTasksSchema() {
  console.log('\n📋 Проверка схемы таблицы tasks...\n');
  
  // Проверим структуру через вставку с разными значениями
  console.log('1️⃣ Попытка вставить задачу с project_id = null:');
  const testNull = await supabase.from('tasks').insert({
    title: 'TEST - Inbox task',
    project_id: null,
    priority: 2,
    status: 'todo',
    created_at: new Date().toISOString(),
  }).select();
  
  if (testNull.error) {
    console.log('❌ ОШИБКА:', testNull.error.message);
    console.log('   Код:', testNull.error.code);
    console.log('   Детали:', testNull.error.details);
    console.log('\n💡 Нужно выполнить: ALTER TABLE tasks ALTER COLUMN project_id DROP NOT NULL;');
  } else {
    console.log('✅ OK - можно создавать задачи без project_id');
    // Удалим тестовую задачу
    if (testNull.data?.[0]?.id) {
      await supabase.from('tasks').delete().eq('id', testNull.data[0].id);
      console.log('   (тестовая задача удалена)');
    }
  }

  // Проверим какие поля обязательные
  console.log('\n2️⃣ Проверка обязательных полей:');
  const minimal = await supabase.from('tasks').insert({
    title: 'TEST - Minimal',
  }).select();
  
  if (minimal.error) {
    console.log('❌ Обязательные поля:', minimal.error.message);
    const match = minimal.error.message.match(/column "([^"]+)"/);
    if (match) {
      console.log(`   Не хватает поля: ${match[1]}`);
    }
  } else {
    console.log('✅ Минимальные данные работают');
    if (minimal.data?.[0]?.id) {
      await supabase.from('tasks').delete().eq('id', minimal.data[0].id);
    }
  }

  // Получим одну существующую задачу для анализа структуры
  console.log('\n3️⃣ Структура существующих задач:');
  const { data: existing } = await supabase.from('tasks').select('*').limit(1);
  if (existing && existing[0]) {
    console.log('Поля в таблице:');
    Object.keys(existing[0]).forEach(key => {
      const value = existing[0][key];
      const type = value === null ? 'NULL' : typeof value;
      console.log(`  - ${key}: ${type} (пример: ${JSON.stringify(value)})`);
    });
  }

  // Проверим типы priority и status
  console.log('\n4️⃣ Проверка допустимых значений:');
  
  // Проверим priority
  const testPriority = await supabase.from('tasks').insert({
    title: 'TEST - Priority',
    project_id: null,
    priority: 999,
    status: 'todo',
    created_at: new Date().toISOString(),
  }).select();
  
  if (testPriority.error) {
    console.log('❌ Priority ограничен:', testPriority.error.message);
  } else {
    console.log('✅ Priority принимает любые числа');
    if (testPriority.data?.[0]?.id) {
      await supabase.from('tasks').delete().eq('id', testPriority.data[0].id);
    }
  }

  // Проверим status
  const testStatus = await supabase.from('tasks').insert({
    title: 'TEST - Status',
    project_id: null,
    priority: 2,
    status: 'invalid_status',
    created_at: new Date().toISOString(),
  }).select();
  
  if (testStatus.error) {
    console.log('❌ Status ограничен:', testStatus.error.message);
  } else {
    console.log('✅ Status принимает любые строки');
    if (testStatus.data?.[0]?.id) {
      await supabase.from('tasks').delete().eq('id', testStatus.data[0].id);
    }
  }

  console.log('\n📊 Текущее состояние базы:');
  const { count: totalTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
  const { count: nullProjectTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).is('project_id', null);
  
  console.log(`  Всего задач: ${totalTasks}`);
  console.log(`  Задач без проекта (Inbox): ${nullProjectTasks || 0}`);
}

checkTasksSchema();
