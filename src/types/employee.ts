// Типы данных для сотрудников
export interface Employee {
  id: string;
  name: string;
  position: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
}

// Тип для экипажей/бригад
export interface Crew {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// Отношение сотрудников к бригадам
export interface CrewMember {
  id: string;
  crew_id: string;
  employee_id: string;
  role?: string;
}