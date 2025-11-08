import { supabase } from '@/lib/supabase';
import { Project, NewProject, UpdateProject } from '@/types/project';

// Получение всех проектов
export async function getAllProjects(): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка при получении проектов:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Исключение при получении проектов:', err);
    return [];
  }
}

// Получение проекта по ID
export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Ошибка при получении проекта с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при получении проекта с ID ${id}:`, err);
    return null;
  }
}

// Создание нового проекта
export async function createProject(project: NewProject): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании проекта:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Исключение при создании проекта:', err);
    return null;
  }
}

// Обновление проекта
export async function updateProject(id: string, updates: UpdateProject): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Ошибка при обновлении проекта с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при обновлении проекта с ID ${id}:`, err);
    return null;
  }
}

// Удаление проекта
export async function deleteProject(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Ошибка при удалении проекта с ID ${id}:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Исключение при удалении проекта с ID ${id}:`, err);
    return false;
  }
}

// Получение статистики по проекту (количество задач, выполненных задач)
export async function getProjectStats(projectId: string): Promise<{ tasksCount: number; tasksCompleted: number }> {
  try {
    // Общее количество задач
    const { count: tasksCount, error: countError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (countError) {
      console.error(`Ошибка при получении количества задач для проекта ${projectId}:`, countError);
      return { tasksCount: 0, tasksCompleted: 0 };
    }

    // Количество выполненных задач
    const { count: tasksCompleted, error: completedError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'done');

    if (completedError) {
      console.error(`Ошибка при получении выполненных задач для проекта ${projectId}:`, completedError);
      return { tasksCount: tasksCount || 0, tasksCompleted: 0 };
    }

    return {
      tasksCount: tasksCount || 0,
      tasksCompleted: tasksCompleted || 0,
    };
  } catch (err) {
    console.error(`Исключение при получении статистики для проекта ${projectId}:`, err);
    return { tasksCount: 0, tasksCompleted: 0 };
  }
}