// Типы данных для проектов
export interface Project {
  id: string;
  title: string;
  client: string;
  address: string;
  status: 'planning' | 'active' | 'on_hold' | 'done' | 'cancelled';
  due_date?: string;
  budget?: number;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// Типы для создания нового проекта
export type NewProject = Omit<Project, 'id' | 'created_at' | 'updated_at'>;

// Типы для обновления проекта
export type UpdateProject = Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;