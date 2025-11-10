// ============================================
// TypeScript типы для таблицы tasks
// ============================================

/**
 * Статусы задачи
 */
export type TaskStatus = 
  | 'todo'        // К выполнению
  | 'in_progress' // В работе
  | 'blocked'     // Заблокирована
  | 'review'      // На проверке
  | 'done';       // Выполнена

/**
 * Карта статусов задачи
 */
export const taskStatusMap: Record<TaskStatus, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  blocked: 'Заблокирована',
  review: 'На проверке',
  done: 'Выполнена'
};

/**
 * Приоритеты задачи
 */
export type TaskPriority = 1 | 2 | 3;

/**
 * Карта приоритетов
 */
export const taskPriorityMap: Record<TaskPriority, string> = {
  1: 'Высокий',
  2: 'Средний',
  3: 'Низкий'
};

/**
 * Интерфейс задачи
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  assignee_id?: string;
  due_date?: string;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Данные для создания задачи
 */
export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  project_id: string;
  assignee_id?: string;
  due_date?: string;
}
