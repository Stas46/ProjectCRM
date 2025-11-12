/**
 * n8n AI Actions Helper
 * Вызов n8n workflows из Data Agent
 */

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_URL || 'https://n8n.alu.stella-spb.ru';

export interface N8nActionRequest {
  action: 'create_task' | 'update_task' | 'delete_task' | 'get_tasks';
  user_id: string;
  telegram_id?: number;
  data: any;
}

export interface N8nActionResponse {
  success: boolean;
  action: string;
  task_id?: string;
  task_title?: string;
  notifications_sent?: string[];
  message: string;
  error?: string;
}

/**
 * Выполнить действие через n8n
 */
export async function executeN8nAction(
  action: string,
  userId: string,
  data: any,
  telegramId?: number
): Promise<N8nActionResponse> {
  try {
    console.log(`🔄 Executing n8n action: ${action}`, { userId, telegramId });

    const response = await fetch(`${N8N_BASE_URL}/webhook/ai-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        user_id: userId,
        telegram_id: telegramId,
        data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ n8n action failed:', response.status, errorText);
      return {
        success: false,
        action,
        message: `n8n error: ${response.status}`,
        error: errorText,
      };
    }

    const result: N8nActionResponse = await response.json();
    console.log('✅ n8n action completed:', result);
    return result;
  } catch (error: any) {
    console.error('❌ n8n action error:', error);
    return {
      success: false,
      action,
      message: 'Failed to execute n8n action',
      error: error.message,
    };
  }
}

/**
 * Создать задачу через n8n
 */
export async function createTaskViaN8n(
  userId: string,
  taskData: {
    title: string;
    description?: string;
    priority?: number;
    status?: string;
    due_date?: string;
    project_id?: string;
  },
  telegramId?: number
): Promise<N8nActionResponse> {
  return executeN8nAction('create_task', userId, taskData, telegramId);
}

/**
 * Обновить задачу через n8n
 */
export async function updateTaskViaN8n(
  userId: string,
  taskId: string,
  updates: any,
  telegramId?: number
): Promise<N8nActionResponse> {
  return executeN8nAction('update_task', userId, { task_id: taskId, ...updates }, telegramId);
}

/**
 * Форматировать ответ n8n для AI
 */
export function formatN8nResponseForAI(response: N8nActionResponse): string {
  if (!response.success) {
    return `❌ Ошибка: ${response.message || response.error || 'Не удалось выполнить действие'}`;
  }

  let message = '✅ ';

  switch (response.action) {
    case 'create_task':
      message += `Создал задачу "${response.task_title}"`;
      if (response.notifications_sent && response.notifications_sent.length > 0) {
        const notifIcons: { [key: string]: string } = {
          telegram: '📱',
          email: '📧',
          sms: '📲',
        };
        const notifList = response.notifications_sent
          .map((n) => notifIcons[n] || n)
          .join(' ');
        message += `\n${notifList} Уведомления отправлены`;
      }
      break;

    case 'update_task':
      message += `Обновил задачу "${response.task_title}"`;
      break;

    case 'delete_task':
      message += `Удалил задачу`;
      break;

    default:
      message += response.message;
  }

  return message;
}
