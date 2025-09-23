import { supabase } from '@/lib/supabase';
import { Invoice, NewInvoice, UpdateInvoice } from '@/types/invoice';

// Получение всех счетов
export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка при получении счетов:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Исключение при получении счетов:', err);
    return [];
  }
}

// Получение счетов по ID проекта
export async function getInvoicesByProjectId(projectId: string): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
      .order('issue_date', { ascending: false });

    if (error) {
      console.error(`Ошибка при получении счетов для проекта ${projectId}:`, error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error(`Исключение при получении счетов для проекта ${projectId}:`, err);
    return [];
  }
}

// Получение счета по ID
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Ошибка при получении счета с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при получении счета с ID ${id}:`, err);
    return null;
  }
}

// Создание нового счета
export async function createInvoice(invoice: NewInvoice): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert([invoice])
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании счета:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Исключение при создании счета:', err);
    return null;
  }
}

// Обновление счета
export async function updateInvoice(id: string, updates: UpdateInvoice): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Ошибка при обновлении счета с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при обновлении счета с ID ${id}:`, err);
    return null;
  }
}

// Удаление счета
export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Ошибка при удалении счета с ID ${id}:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Исключение при удалении счета с ID ${id}:`, err);
    return false;
  }
}

// Получение общей суммы счетов для проекта
export async function getProjectInvoicesTotal(projectId: string): Promise<{ total: number; paid: number }> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('amount, status')
      .eq('project_id', projectId);

    if (error) {
      console.error(`Ошибка при получении суммы счетов для проекта ${projectId}:`, error);
      return { total: 0, paid: 0 };
    }

    if (!data || data.length === 0) {
      return { total: 0, paid: 0 };
    }

    const total = data.reduce((sum, invoice) => sum + invoice.amount, 0);
    const paid = data
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    return { total, paid };
  } catch (err) {
    console.error(`Исключение при получении суммы счетов для проекта ${projectId}:`, err);
    return { total: 0, paid: 0 };
  }
}// Алиас для getInvoicesByProjectId
export const getProjectInvoices = getInvoicesByProjectId;
