import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Отсутствуют env переменные');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log('\n=== ПРОЕКТЫ В БД ===');
  const { data: projects, error: pErr } = await supabase.from('projects').select('*');
  if (pErr) {
    console.error('Ошибка загрузки проектов:', pErr);
  } else {
    console.log('Всего проектов:', projects?.length);
    projects?.forEach(p => {
      console.log(`\nID: ${p.id}`);
      console.log(`  title: ${p.title || 'НЕТ'}`);
      console.log(`  name: ${p.name || 'НЕТ'}`);
      console.log(`  emoji: ${p.emoji || 'НЕТ'}`);
      console.log(`  Все поля:`, Object.keys(p));
    });
  }

  console.log('\n=== ЗАДАЧИ В БД ===');
  const { data: tasks, error: tErr } = await supabase.from('tasks').select('id, title, project_id');
  if (tErr) {
    console.error('Ошибка загрузки задач:', tErr);
  } else {
    tasks?.forEach(t => {
      console.log(`Задача: ${t.title}`);
      console.log(`  project_id: ${t.project_id || 'НЕТ'}`);
    });
  }

  // Orphans
  if (projects && tasks) {
    const projectIds = new Set(projects.map(p => p.id));
    const usedProjectIds = new Set(tasks.map(t => t.project_id).filter(Boolean));
    const orphans = Array.from(usedProjectIds).filter(id => !projectIds.has(id));
    
    console.log('\n=== ORPHAN PROJECT IDs ===');
    if (orphans.length > 0) {
      orphans.forEach(id => {
        console.log(`❌ ${id} (используется в задачах, но нет в projects)`);
        const matchingTasks = tasks.filter(t => t.project_id === id);
        console.log(`   Задачи: ${matchingTasks.map(t => t.title).join(', ')}`);
      });
    } else {
      console.log('✅ Orphan project_id не найдены!');
    }
  }
}

debug();
