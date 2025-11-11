/**
 * CRM Data Tools для Personal Assistant
 * Функции для безопасного доступа к данным с учетом RLS (Row Level Security)
 */

import { createClient } from '@supabase/supabase-js';

// Создаем Supabase клиента
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient(supabaseUrl, supabaseKey);
}

// ===== ТИПЫ =====

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  project_id?: string;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  deadline?: string;
  total_cost?: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  supplier_name?: string;
  invoice_date?: string;
  total_amount?: number;
  paid_status?: boolean;
  project_id?: string;
  created_at: string;
}

export interface DataQueryFilters {
  status?: string;
  priority?: string;
  project_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

// ===== ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ =====

/**
 * Получить задачи пользователя
 */
export async function getUserTasks(
  userId: string,
  filters?: DataQueryFilters
): Promise<{ data: Task[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });

    // Применяем фильтры
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching tasks:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Task[], error: null };
  } catch (error: any) {
    console.error('❌ Exception in getUserTasks:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Получить проекты пользователя
 */
export async function getUserProjects(
  userId: string,
  filters?: DataQueryFilters
): Promise<{ data: Project[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching projects:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Project[], error: null };
  } catch (error: any) {
    console.error('❌ Exception in getUserProjects:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Получить счета
 */
export async function getUserInvoices(
  userId: string,
  filters?: DataQueryFilters & { paid_status?: boolean }
): Promise<{ data: Invoice[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.paid_status !== undefined) {
      query = query.eq('paid_status', filters.paid_status);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching invoices:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Invoice[], error: null };
  } catch (error: any) {
    console.error('❌ Exception in getUserInvoices:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Получить детали проекта по ID
 */
export async function getProjectById(
  userId: string,
  projectId: string
): Promise<{ data: Project | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('created_by', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching project:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Project, error: null };
  } catch (error: any) {
    console.error('❌ Exception in getProjectById:', error);
    return { data: null, error: error.message };
  }
}

// ===== ФУНКЦИИ ДЛЯ ФОРМАТИРОВАНИЯ ДАННЫХ =====

/**
 * Форматировать задачи в текст для AI
 */
export function formatTasksForAI(tasks: Task[]): string {
  if (!tasks || tasks.length === 0) {
    return 'Нет задач.';
  }

  const formatted = tasks.map((task, index) => {
    const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
    const status = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
    const dueDate = task.due_date ? ` (срок: ${new Date(task.due_date).toLocaleDateString('ru-RU')})` : '';
    
    return `${index + 1}. ${status} ${priority} ${task.title}${dueDate}`;
  }).join('\n');

  return `Найдено задач: ${tasks.length}\n\n${formatted}`;
}

/**
 * Форматировать проекты в текст для AI
 */
export function formatProjectsForAI(projects: Project[]): string {
  if (!projects || projects.length === 0) {
    return 'Нет проектов.';
  }

  const formatted = projects.map((project, index) => {
    const priority = project.priority === 'high' ? '🔴' : project.priority === 'medium' ? '🟡' : '🟢';
    const status = project.status === 'completed' ? '✅' : project.status === 'active' ? '🔄' : '📋';
    const client = project.client_name ? ` | Клиент: ${project.client_name}` : '';
    const cost = project.total_cost ? ` | ${project.total_cost.toLocaleString('ru-RU')} ₽` : '';
    
    return `${index + 1}. ${status} ${priority} ${project.title}${client}${cost}`;
  }).join('\n');

  return `Найдено проектов: ${projects.length}\n\n${formatted}`;
}

/**
 * Форматировать счета в текст для AI
 */
export function formatInvoicesForAI(invoices: Invoice[]): string {
  if (!invoices || invoices.length === 0) {
    return 'Нет счетов.';
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const unpaidCount = invoices.filter(inv => !inv.paid_status).length;

  const formatted = invoices.map((invoice, index) => {
    const paid = invoice.paid_status ? '✅ Оплачен' : '❌ Не оплачен';
    const supplier = invoice.supplier_name || 'Неизвестно';
    const amount = invoice.total_amount ? `${invoice.total_amount.toLocaleString('ru-RU')} ₽` : 'Не указано';
    
    return `${index + 1}. ${paid} | ${supplier} | ${amount}`;
  }).join('\n');

  return `Найдено счетов: ${invoices.length} | Неоплачено: ${unpaidCount} | Общая сумма: ${totalAmount.toLocaleString('ru-RU')} ₽\n\n${formatted}`;
}

// ===== УТИЛИТЫ ДЛЯ ДАТА-АГЕНТА =====

/**
 * Определить временной диапазон на основе текста
 */
export function parseDateRange(text: string): { date_from?: string; date_to?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (text.includes('сегодня') || text.includes('today')) {
    return {
      date_from: today.toISOString(),
      date_to: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  if (text.includes('неделя') || text.includes('week')) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Понедельник
    return {
      date_from: weekStart.toISOString(),
      date_to: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  if (text.includes('месяц') || text.includes('month')) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      date_from: monthStart.toISOString(),
      date_to: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()
    };
  }

  return {};
}
