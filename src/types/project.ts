// TypeScript типы для таблицы projects

export type ProjectStatus = 
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'done'
  | 'cancelled';

export const projectStatusMap: Record<ProjectStatus, string> = {
  planning: 'Планирование',
  active: 'Активный',
  on_hold: 'На паузе',
  done: 'Завершен',
  cancelled: 'Отменен'
};

export interface Project {
  id: string;
  title: string;
  client: string;
  address?: string;
  status: ProjectStatus;
  description?: string;
  due_date?: string;
  budget?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateProjectData {
  title: string;
  client: string;
  address?: string;
  status?: ProjectStatus;
  description?: string;
  due_date?: string;
  budget?: number;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  totalInvoices: number;
  totalSpent: number;
  budgetUsage: number;
  categoryBreakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}
