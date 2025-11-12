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
  status: 'todo' | 'in_progress' | 'done';
  priority: number; // 1=важная, 2=средняя, 3=низкая
  project_id?: string;
  assignee_id?: string;
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
      .eq('assignee_id', userId)
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

// ===== ФУНКЦИИ ДЛЯ СОЗДАНИЯ ДАННЫХ =====

/**
 * Создать новую задачу
 */
export async function createTask(
  userId: string,
  taskData: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 1 | 2 | 3;
    status?: 'todo' | 'in_progress' | 'done';
    due_date?: string;
    project_id?: string;
  }
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    // Конвертируем текстовый приоритет в числовой для матрицы Эйзенхауэра
    // 1 = важная/срочная, 2 = средняя, 3 = низкая
    let numericPriority: number;
    if (typeof taskData.priority === 'string') {
      const priorityMap: { [key: string]: number } = {
        'high': 1,
        'medium': 2,
        'low': 3
      };
      numericPriority = priorityMap[taskData.priority] || 2;
    } else {
      numericPriority = taskData.priority || 2;
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description,
        priority: numericPriority,
        status: taskData.status || 'todo',
        due_date: taskData.due_date,
        project_id: taskData.project_id,
        assignee_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating task:', error);
      return { data: null, error: error.message };
    }

    console.log('✅ Task created:', data);
    
    // Отправляем уведомление через n8n (асинхронно, не блокируем ответ)
    if (data) {
      import('./n8n-notifications').then(({ notifyTaskCreated, getUserTelegramId }) => {
        getUserTelegramId(userId).then(telegramId => {
          if (telegramId) {
            notifyTaskCreated(
              {
                id: data.id,
                title: data.title,
                priority: data.priority,
                quadrant: `${data.priority}-${data.status}`,
                deadline: data.due_date,
              },
              telegramId,
              userId
            ).catch(err => console.error('⚠️ n8n notification error:', err));
          }
        });
      });
    }
    
    return { data: data as Task, error: null };
  } catch (error: any) {
    console.error('❌ Exception in createTask:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Обновить задачу
 */
export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<Task>
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('assignee_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating task:', error);
      return { data: null, error: error.message };
    }

    console.log('✅ Task updated:', data);
    return { data: data as Task, error: null };
  } catch (error: any) {
    console.error('❌ Exception in updateTask:', error);
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
    const priorityMap: any = {1: '🔴 Важная', 2: '🟡 Средняя', 3: '🟢 Низкая'};
    const priority = priorityMap[task.priority] || `Приоритет ${task.priority}`;
    
    const statusMap: any = {
      'done': '✅ Завершена',
      'in_progress': '🔄 В процессе',
      'todo': '⏳ Новая'
    };
    const status = statusMap[task.status] || task.status;
    
    const quadrantMap: any = {
      '1-in_progress': '🔥 UV (важно+срочно)',
      '1-todo': '⭐ V (важно)',
      '2-in_progress': '⚡ U (срочно)',
      '2-todo': '📋 O (обычная)'
    };
    const quadrant = quadrantMap[`${task.priority}-${task.status}`] || '';
    
    const dueDate = task.due_date ? `\n   Срок: ${new Date(task.due_date).toLocaleDateString('ru-RU')}` : '';
    const description = task.description ? `\n   Описание: ${task.description}` : '';
    const projectInfo = task.project_id ? `\n   Проект ID: ${task.project_id}` : '';
    
    return `${index + 1}. **${task.title}**
   Статус: ${status}
   ${quadrant}${dueDate}${description}${projectInfo}`;
  }).join('\n\n');

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
    const priority = project.priority === 'high' ? '🔴 Высокий' : project.priority === 'medium' ? '🟡 Средний' : '🟢 Низкий';
    const statusMap = {
      'completed': '✅ Завершен',
      'active': '🔄 Активен',
      'draft': '📋 Черновик',
      'cancelled': '❌ Отменен'
    };
    const status = statusMap[project.status] || project.status;
    const client = project.client_name ? `\n   Клиент: ${project.client_name}` : '';
    const phone = project.client_phone ? `\n   Телефон: ${project.client_phone}` : '';
    const cost = project.total_cost ? `\n   Стоимость: ${project.total_cost.toLocaleString('ru-RU')} ₽` : '';
    const deadline = project.deadline ? `\n   Дедлайн: ${new Date(project.deadline).toLocaleDateString('ru-RU')}` : '';
    
    return `${index + 1}. **${project.title}**
   Статус: ${status}
   Приоритет: ${priority}${client}${phone}${cost}${deadline}`;
  }).join('\n\n');

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
    const amount = invoice.total_amount ? invoice.total_amount.toLocaleString('ru-RU') : 'Не указано';
    const invoiceDate = invoice.invoice_date ? `\n   Дата: ${new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}` : '';
    const projectInfo = invoice.project_id ? `\n   Проект ID: ${invoice.project_id}` : '';
    
    return `${index + 1}. **${invoice.invoice_number || 'Без номера'}**
   Статус: ${paid}
   Поставщик: ${supplier}
   Сумма: ${amount} ₽${invoiceDate}${projectInfo}`;
  }).join('\n\n');

  return `Найдено счетов: ${invoices.length}\nНеоплачено: ${unpaidCount}\nОбщая сумма: ${totalAmount.toLocaleString('ru-RU')} ₽\n\n${formatted}`;
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
