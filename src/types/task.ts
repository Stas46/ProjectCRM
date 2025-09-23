// Типы данных для задач
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 1 | 2 | 3; // 1 - высокий, 2 - средний, 3 - низкий
  project_id: string;
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
}

// Типы для создания новой задачи
export type NewTask = Omit<Task, 'id' | 'created_at' | 'updated_at'>;

// Типы для обновления задачи
export type UpdateTask = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>;