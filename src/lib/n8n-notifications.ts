/**
 * n8n Notification Helper
 * Отправка уведомлений через n8n workflows
 */

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_URL || 'https://n8n.alu.stella-spb.ru';

export interface TaskNotification {
  type: 'task_created' | 'task_updated' | 'task_deadline_reminder';
  task: {
    id: string;
    title: string;
    priority?: number;
    quadrant?: string;
    deadline?: string;
    status?: string;
  };
  telegram_id: number;
  user_id?: string;
}

export interface InvoiceNotification {
  type: 'invoice_created' | 'invoice_alert';
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    supplier_name: string;
    date?: string;
  };
  telegram_id: number;
  user_id?: string;
}

export interface ProjectNotification {
  type: 'project_updated' | 'project_deadline';
  project: {
    id: string;
    name: string;
    client_name?: string;
    deadline?: string;
  };
  telegram_id: number;
  user_id?: string;
}

export type N8nNotification = TaskNotification | InvoiceNotification | ProjectNotification;

/**
 * Отправить уведомление через n8n
 */
export async function sendN8nNotification(notification: N8nNotification): Promise<boolean> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/webhook/telegram-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      console.error('❌ n8n notification failed:', response.status, await response.text());
      return false;
    }

    const result = await response.json();
    console.log('✅ n8n notification sent:', result);
    return result.success === true;
  } catch (error) {
    console.error('❌ n8n notification error:', error);
    return false;
  }
}

/**
 * Отправить уведомление о создании задачи
 */
export async function notifyTaskCreated(
  task: {
    id: string;
    title: string;
    priority?: number;
    quadrant?: string;
    deadline?: string;
  },
  telegramId: number,
  userId?: string
): Promise<boolean> {
  return sendN8nNotification({
    type: 'task_created',
    task,
    telegram_id: telegramId,
    user_id: userId,
  });
}

/**
 * Отправить уведомление об обновлении задачи
 */
export async function notifyTaskUpdated(
  task: {
    id: string;
    title: string;
    priority?: number;
    quadrant?: string;
    status?: string;
  },
  telegramId: number,
  userId?: string
): Promise<boolean> {
  return sendN8nNotification({
    type: 'task_updated',
    task,
    telegram_id: telegramId,
    user_id: userId,
  });
}

/**
 * Отправить напоминание о дедлайне задачи
 */
export async function notifyTaskDeadline(
  task: {
    id: string;
    title: string;
    deadline: string;
  },
  telegramId: number,
  userId?: string
): Promise<boolean> {
  return sendN8nNotification({
    type: 'task_deadline_reminder',
    task,
    telegram_id: telegramId,
    user_id: userId,
  });
}

/**
 * Отправить уведомление о критичном счёте
 */
export async function notifyInvoiceAlert(
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    supplier_name: string;
  },
  telegramId: number,
  userId?: string
): Promise<boolean> {
  return sendN8nNotification({
    type: 'invoice_alert',
    invoice,
    telegram_id: telegramId,
    user_id: userId,
  });
}

/**
 * Получить Telegram ID пользователя из базы
 */
export async function getUserTelegramId(userId: string): Promise<number | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('profiles')
      .select('telegram_id')
      .eq('id', userId)
      .single();

    if (error || !data?.telegram_id) {
      return null;
    }

    return data.telegram_id;
  } catch (error) {
    console.error('Error getting telegram_id:', error);
    return null;
  }
}

/**
 * Отправить уведомление пользователю (автоматически получает telegram_id)
 */
export async function notifyUser(
  userId: string,
  notification: Omit<N8nNotification, 'telegram_id' | 'user_id'>
): Promise<boolean> {
  const telegramId = await getUserTelegramId(userId);
  
  if (!telegramId) {
    console.log('⚠️ User does not have Telegram linked:', userId);
    return false;
  }

  return sendN8nNotification({
    ...notification,
    telegram_id: telegramId,
    user_id: userId,
  } as N8nNotification);
}
