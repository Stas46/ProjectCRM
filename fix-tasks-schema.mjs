import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют переменные окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTasksSchema() {
  console.log('\n🔧 Изменение схемы таблицы tasks...\n');
  
  const sql = `
    ALTER TABLE tasks 
    ALTER COLUMN project_id DROP NOT NULL;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Ошибка выполнения SQL:', error);
      console.log('\n📝 Выполни этот SQL вручную в Supabase Dashboard → SQL Editor:');
      console.log(sql);
      console.log('\nИли используй pgAdmin/psql напрямую');
    } else {
      console.log('✅ Схема обновлена успешно!');
      console.log('Теперь поле project_id может быть NULL для задач в Inbox');
    }
  } catch (err) {
    console.error('❌ Ошибка:', err);
    console.log('\n📝 Выполни этот SQL вручную в Supabase Dashboard → SQL Editor:');
    console.log(sql);
  }
}

fixTasksSchema();
