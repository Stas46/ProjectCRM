import { supabase } from '@/lib/supabase';
import { Task, NewTask, UpdateTask } from '@/types/task';

// Получение всех задач
export async function getAllTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка при получении задач:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Исключение при получении задач:', err);
    return [];
  }
}

// Получение задач по ID проекта
export async function getTasksByProjectId(projectId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Ошибка при получении задач для проекта ${projectId}:`, error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error(`Исключение при получении задач для проекта ${projectId}:`, err);
    return [];
  }
}

// Получение задачи по ID
export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Ошибка при получении задачи с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при получении задачи с ID ${id}:`, err);
    return null;
  }
}

// Создание новой задачи
export async function createTask(task: NewTask): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании задачи:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Исключение при создании задачи:', err);
    return null;
  }
}

// Обновление задачи
export async function updateTask(id: string, updates: UpdateTask): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Ошибка при обновлении задачи с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при обновлении задачи с ID ${id}:`, err);
    return null;
  }
}

// Удаление задачи
export async function deleteTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Ошибка при удалении задачи с ID ${id}:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Исключение при удалении задачи с ID ${id}:`, err);
    return false;
  }
}// Алиас для getTasksByProjectId
export const getProjectTasks = getTasksByProjectId;
