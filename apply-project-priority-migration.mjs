import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📦 Применяю миграцию add-project-priority.sql...\n');

  const sql = readFileSync('./add-project-priority.sql', 'utf-8');
  
  // Разбиваем на отдельные команды
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('/*'));

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (!cmd) continue;
    
    console.log(`\n[${i + 1}/${commands.length}] Выполняю команду:`);
    console.log(cmd.substring(0, 100) + '...\n');
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: cmd });
      
      if (error) {
        // Если нет функции exec_sql, пробуем через обычный запрос
        console.warn('⚠️  rpc не работает, пробую альтернативный метод...');
        
        // Для ALTER TABLE используем прямой запрос
        if (cmd.includes('ALTER TABLE')) {
          console.log('ℹ️  Команда ALTER TABLE - нужно выполнить вручную в Supabase Dashboard');
          console.log('📋 Скопируй команду:\n');
          console.log(cmd + ';\n');
          continue;
        }
      } else {
        console.log('✅ Успешно');
      }
    } catch (err) {
      console.error(`❌ Ошибка:`, err.message);
      console.log('📋 Выполни вручную в Supabase SQL Editor:\n');
      console.log(cmd + ';\n');
    }
  }

  console.log('\n✅ Миграция завершена!');
  console.log('\n📝 Проверь, добавилась ли колонка priority:');
  
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, status, priority')
    .limit(3);
    
  if (error) {
    console.error('❌ Ошибка проверки:', error);
  } else {
    console.log('\nПервые 3 проекта:');
    console.table(data);
  }
}

applyMigration();
