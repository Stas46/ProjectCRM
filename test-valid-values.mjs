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

async function testValidValues() {
  console.log('\n🔍 Тестирование допустимых значений...\n');
  
  // Тест priority
  console.log('📊 Тестируем PRIORITY:');
  for (const priority of [1, 2, 3, 4, 5]) {
    const { error } = await supabase.from('tasks').insert({
      title: `TEST Priority ${priority}`,
      priority,
      status: 'todo',
      created_at: new Date().toISOString(),
    }).select();
    
    if (error) {
      console.log(`  ❌ priority=${priority}: ${error.message}`);
    } else {
      console.log(`  ✅ priority=${priority}: OK`);
      // Удаляем тестовую
      await supabase.from('tasks').delete().match({ title: `TEST Priority ${priority}` });
    }
  }
  
  // Тест status
  console.log('\n📝 Тестируем STATUS:');
  const statuses = ['todo', 'in_progress', 'done', 'pending', 'blocked', 'cancelled'];
  for (const status of statuses) {
    const { error } = await supabase.from('tasks').insert({
      title: `TEST Status ${status}`,
      priority: 2,
      status,
      created_at: new Date().toISOString(),
    }).select();
    
    if (error) {
      console.log(`  ❌ status='${status}': ${error.message}`);
    } else {
      console.log(`  ✅ status='${status}': OK`);
      // Удаляем тестовую
      await supabase.from('tasks').delete().match({ title: `TEST Status ${status}` });
    }
  }
  
  console.log('\n💡 Рекомендации:');
  console.log('  Используй только допустимые значения (помеченные ✅)');
}

testValidValues();
