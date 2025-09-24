import { supabase } from '@/lib/supabase';
import { Employee, Crew, CrewMember } from '@/types/employee';

// Получение всех сотрудников
export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');

    if (error) {
      console.error('Ошибка при получении сотрудников:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Исключение при получении сотрудников:', err);
    return [];
  }
}

// Получение сотрудника по ID
export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Ошибка при получении сотрудника с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при получении сотрудника с ID ${id}:`, err);
    return null;
  }
}

// Создание нового сотрудника
export async function createEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee | null> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании сотрудника:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Исключение при создании сотрудника:', err);
    throw err;
  }
}

// Обновление сотрудника
export async function updateEmployee(id: string, updates: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>): Promise<Employee | null> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Ошибка при обновлении сотрудника с ID ${id}:`, error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при обновлении сотрудника с ID ${id}:`, err);
    throw err;
  }
}

// Получение всех бригад
export async function getAllCrews(): Promise<Crew[]> {
  try {
    const { data, error } = await supabase
      .from('crews')
      .select('*')
      .order('name');

    if (error) {
      console.error('Ошибка при получении бригад:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Исключение при получении бригад:', err);
    return [];
  }
}

// Получение бригады по ID
export async function getCrewById(id: string): Promise<Crew | null> {
  try {
    const { data, error } = await supabase
      .from('crews')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Ошибка при получении бригады с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при получении бригады с ID ${id}:`, err);
    return null;
  }
}

// Получение участников бригады
export async function getCrewMembers(crewId: string): Promise<Employee[]> {
  try {
    const { data, error } = await supabase
      .from('crew_members')
      .select('employee_id')
      .eq('crew_id', crewId);

    if (error) {
      console.error(`Ошибка при получении участников бригады ${crewId}:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const employeeIds = data.map(member => member.employee_id);

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .in('id', employeeIds);

    if (employeesError) {
      console.error(`Ошибка при получении данных сотрудников для бригады ${crewId}:`, employeesError);
      return [];
    }

    return employees || [];
  } catch (err) {
    console.error(`Исключение при получении участников бригады ${crewId}:`, err);
    return [];
  }
}