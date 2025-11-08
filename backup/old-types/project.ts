// Типы данных для проектов
export type ProjectStatus = 
  | 'planning'      // Планирование
  | 'active'        // В работе (было 'in_progress')
  | 'on_hold'       // Приостановлен
  | 'done'          // Завершен (было 'completed')
  | 'cancelled';    // Отменен

export interface Project {
  id: string;
  project_number: string;  // Уникальный номер проекта (PRJ-2024-0001)
  title: string;  // Изменено с 'name' на 'title' для соответствия БД
  
  // Связи
  client_id: string;      // Ссылка на клиента
  manager_id?: string;    // Ответственный менеджер
  
  // Основная информация
  address: string;
  status: ProjectStatus;
  
  // Даты
  start_date?: string;
  due_date?: string;        // Изменено с 'end_date' на 'due_date' для соответствия БД
  actual_end_date?: string;
  
  // Финансы
  budget?: number;
  actual_cost?: number;  // Рассчитывается автоматически из счетов
  
  // Договор
  contract_number?: string;
  contract_date?: string;
  warranty_period?: number;  // В месяцах
  warranty_end_date?: string;
  
  // Метрики
  area_sqm?: number;          // Площадь в кв.м
  floor_count?: number;       // Количество этажей
  window_count?: number;      // Количество окон
  
  // Дополнительно
  description?: string;
  notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
}

// Типы для создания нового проекта
export type NewProject = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'actual_cost' | 'actual_end_date'>;

// Типы для обновления проекта
export type UpdateProject = Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'actual_cost'>>;

// Карта статусов проектов
export const projectStatusMap: Record<ProjectStatus, string> = {
  planning: 'Планирование',
  active: 'В работе',
  on_hold: 'Приостановлен',
  done: 'Завершен',
  cancelled: 'Отменен'
};

// Цвета для статусов
export const projectStatusColors: Record<ProjectStatus, string> = {
  planning: 'blue',
  active: 'yellow',
  on_hold: 'orange',
  done: 'green',
  cancelled: 'red'
};