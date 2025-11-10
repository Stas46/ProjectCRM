import { supabase } from '@/lib/supabase';

async function checkProjectsAndTasks() {
  console.log('Checking projects...');
  const { data: projects, error: projError } = await supabase.from('projects').select('*');
  if (projError) {
    console.error('Projects error:', projError);
  } else {
    console.log('Projects:', projects);
  }

  console.log('Checking tasks...');
  const { data: tasks, error: taskError } = await supabase.from('tasks').select('*');
  if (taskError) {
    console.error('Tasks error:', taskError);
  } else {
    console.log('Tasks:', tasks?.map(t => ({ id: t.id, project_id: t.project_id, title: t.title })));
  }

  // Check orphans
  if (projects && tasks) {
    const projectIds = new Set(projects.map(p => p.id));
    const orphanTasks = tasks.filter(t => t.project_id && !projectIds.has(t.project_id));
    console.log('Orphan tasks:', orphanTasks.map(t => ({ id: t.id, project_id: t.project_id, title: t.title })));
  }
}

checkProjectsAndTasks();