import { supabase } from '@/lib/supabase';
import { Shift, NewShift, UpdateShift, ShiftAssignee } from '@/types/shift';
import { Employee } from '@/types/employee';

// Получение всех смен
export async function getAllShifts(): Promise<Shift[]> {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Ошибка при получении смен:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Исключение при получении смен:', err);
    return [];
  }
}

// Получение смены по ID
export async function getShiftById(id: string): Promise<Shift | null> {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Ошибка при получении смены с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при получении смены с ID ${id}:`, err);
    return null;
  }
}

// Получение назначенных сотрудников для смены
export async function getShiftAssignees(shiftId: string): Promise<Employee[]> {
  try {
    const { data, error } = await supabase
      .from('shift_assignees')
      .select('employee_id')
      .eq('shift_id', shiftId);

    if (error) {
      console.error(`Ошибка при получении назначений для смены ${shiftId}:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const employeeIds = data.map(assignee => assignee.employee_id);

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .in('id', employeeIds);

    if (employeesError) {
      console.error(`Ошибка при получении сотрудников для смены ${shiftId}:`, employeesError);
      return [];
    }

    return employees || [];
  } catch (err) {
    console.error(`Исключение при получении назначений для смены ${shiftId}:`, err);
    return [];
  }
}

// Создание новой смены
export async function createShift(shift: NewShift, assigneeIds: string[] = []): Promise<Shift | null> {
  // Начинаем транзакцию
  try {
    // 1. Создаем смену
    const { data, error } = await supabase
      .from('shifts')
      .insert([shift])
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании смены:', error);
      return null;
    }

    const newShift = data;

    // 2. Если есть назначенные сотрудники, добавляем их
    if (assigneeIds.length > 0) {
      const assignees = assigneeIds.map(employeeId => ({
        shift_id: newShift.id,
        employee_id: employeeId
      }));

      const { error: assigneeError } = await supabase
        .from('shift_assignees')
        .insert(assignees);

      if (assigneeError) {
        console.error(`Ошибка при назначении сотрудников для смены ${newShift.id}:`, assigneeError);
        // Можно удалить смену, если назначения не удались
        // await supabase.from('shifts').delete().eq('id', newShift.id);
        // return null;
      }
    }

    return newShift;
  } catch (err) {
    console.error('Исключение при создании смены:', err);
    return null;
  }
}

// Обновление смены
export async function updateShift(
  id: string, 
  updates: UpdateShift, 
  assigneeIds?: string[]
): Promise<Shift | null> {
  try {
    // 1. Обновляем смену
    const { data, error } = await supabase
      .from('shifts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Ошибка при обновлении смены с ID ${id}:`, error);
      return null;
    }

    // 2. Если предоставлены назначения, обновляем их
    if (assigneeIds !== undefined) {
      // Сначала удаляем все назначения
      const { error: deleteError } = await supabase
        .from('shift_assignees')
        .delete()
        .eq('shift_id', id);

      if (deleteError) {
        console.error(`Ошибка при удалении назначений для смены ${id}:`, deleteError);
      }

      // Затем добавляем новые
      if (assigneeIds.length > 0) {
        const assignees = assigneeIds.map(employeeId => ({
          shift_id: id,
          employee_id: employeeId
        }));

        const { error: assigneeError } = await supabase
          .from('shift_assignees')
          .insert(assignees);

        if (assigneeError) {
          console.error(`Ошибка при назначении сотрудников для смены ${id}:`, assigneeError);
        }
      }
    }

    return data;
  } catch (err) {
    console.error(`Исключение при обновлении смены с ID ${id}:`, err);
    return null;
  }
}

// Удаление смены
export async function deleteShift(id: string): Promise<boolean> {
  try {
    // 1. Удаляем назначения
    const { error: assigneeError } = await supabase
      .from('shift_assignees')
      .delete()
      .eq('shift_id', id);

    if (assigneeError) {
      console.error(`Ошибка при удалении назначений для смены ${id}:`, assigneeError);
    }

    // 2. Удаляем смену
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Ошибка при удалении смены с ID ${id}:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Исключение при удалении смены с ID ${id}:`, err);
    return false;
  }
}// Получение смен по ID проекта
export async function getShiftsByProjectId(projectId: string): Promise<Shift[]> {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('project_id', projectId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error(`Ошибка при получении смен для проекта ${projectId}:`, error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error(`Исключение при получении смен для проекта ${projectId}:`, err);
    return [];
  }
}

// Алиас для getShiftsByProjectId
export const getProjectShifts = getShiftsByProjectId;
