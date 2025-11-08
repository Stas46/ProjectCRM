// Типы данных для смен в календаре
export interface Shift {
  id: string;
  title: string;
  project_id: string;
  crew_id?: string;
  start_time: string;
  end_time: string;
  location: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// Тип для отношения сотрудников к сменам
export interface ShiftAssignee {
  id: string;
  shift_id: string;
  employee_id: string;
}

// Типы для создания новой смены
export type NewShift = Omit<Shift, 'id' | 'created_at' | 'updated_at'>;

// Типы для обновления смены
export type UpdateShift = Partial<Omit<Shift, 'id' | 'created_at' | 'updated_at'>>;