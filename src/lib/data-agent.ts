/**
 * Data Agent - анализирует запросы пользователя и извлекает нужные данные
 * Использует DeepSeek для определения намерений
 */

import OpenAI from 'openai';
import {
  getUserTasks,
  getUserProjects,
  getUserInvoices,
  createTask,
  updateTask,
  formatTasksForAI,
  formatProjectsForAI,
  formatInvoicesForAI,
  parseDateRange,
  type DataQueryFilters
} from './crm-data-tools';
import { startAgentLog, consoleLog } from './agent-logger';

// Утилита для проверки UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com'
});

// Системный промпт для Data Agent
const DATA_AGENT_SYSTEM_PROMPT = `
Ты - ассистент CRM-системы для остекления и алюминиевых конструкций.

Доступные действия:
1. **get_tasks** - получить/показать/найти задачи
2. **get_projects** - получить/показать проекты  
3. **get_invoices** - получить/показать счета
4. **create_task** - создать/добавить/напомнить задачу
5. **update_task** - изменить/обновить/переместить задачу

ВАЖНО: Если пользователь просит СОЗДАТЬ/ДОБАВИТЬ/НАПОМНИТЬ - используй create_task!
Если ИЗМЕНИТЬ/ОБНОВИТЬ/ПЕРЕМЕСТИТЬ/ПОСТАВИТЬ ПРИОРИТЕТ - используй update_task!

Формат ответа JSON:
{
  "action": "get_tasks" | "create_task" | "update_task" | "get_projects" | "get_invoices" | "unknown",
  "filters": {...},  // только для get_*
  "data": {...},     // для create_* и update_*
  "reasoning": "что понял"
}

РАСПОЗНАВАНИЕ ПРИОРИТЕТА (важность + срочность):
- "важно и срочно" / "важно срочно" / "важная срочная" / "1" → priority: 1, status: "in_progress" (квадрант UV)
- "важно" / "важная" / "2" → priority: 1, status: "todo" (квадрант V)
- "срочно" / "срочная" / "3" → priority: 2, status: "in_progress" (квадрант U)
- "обычная" / "не срочно" / "4" → priority: 2, status: "todo" (квадрант O)

ОПЕЧАТКИ: распознавай варианты "важна", "срочна", "важнно", "срочьно", "вжано" и т.д.

Примеры СОЗДАНИЯ (create_task):
"создай важную задачу купить крышки" → {"action": "create_task", "data": {"title": "Купить крышки", "priority": 1, "status": "todo"}, "reasoning": "Важная задача"}

"добавь срочную задачу согласовать смету" → {"action": "create_task", "data": {"title": "Согласовать смету", "priority": 2, "status": "in_progress"}, "reasoning": "Срочная задача"}

"важно и срочно позвонить клиенту" → {"action": "create_task", "data": {"title": "Позвонить клиенту", "priority": 1, "status": "in_progress"}, "reasoning": "Важная и срочная"}

"купить крышки для школы" → {"action": "create_task", "data": {"title": "Купить крышки", "project_id": "школа"}, "reasoning": "Задача для проекта школа"}

Примеры ОБНОВЛЕНИЯ (update_task):
"поставь высокий приоритет последней задаче" → {"action": "update_task", "data": {"target": "last", "priority": 1, "status": "todo"}, "reasoning": "Сделать важной"}

"переместить в квадрант 1" → {"action": "update_task", "data": {"target": "last", "priority": 1, "status": "in_progress"}, "reasoning": "В важно+срочно"}

"сделай срочной задачу купить крышки" → {"action": "update_task", "data": {"title_contains": "крышки", "priority": 2, "status": "in_progress"}, "reasoning": "Сделать срочной"}

"переместить в 4" → {"action": "update_task", "data": {"target": "last", "priority": 2, "status": "todo"}, "reasoning": "В обычные"}

Примеры ЧТЕНИЯ (get_*):
"какие задачи?" → {"action": "get_tasks", "filters": {}, "reasoning": "Показать задачи"}

"покажи срочные задачи" → {"action": "get_tasks", "filters": {"status": "in_progress"}, "reasoning": "Срочные"}

"список проектов" → {"action": "get_projects", "filters": {}, "reasoning": "Показать проекты"}

ВАЖНО: отвечай ТОЛЬКО валидным JSON.
`.trim();

export interface DataAgentRequest {
  action: 'get_tasks' | 'get_projects' | 'get_invoices' | 'create_task' | 'update_task' | 'unknown';
  filters?: DataQueryFilters & { date_range?: string; paid_status?: boolean };
  data?: {
    title?: string;
    description?: string;
    priority?: number | 'low' | 'medium' | 'high';
    status?: 'todo' | 'in_progress' | 'done';
    due_date?: string;
    project_id?: string;
    // Для update_task
    target?: 'last' | 'first' | string; // 'last', 'first', или ID задачи
    title_contains?: string; // поиск задачи по названию
    task_id?: string; // прямой ID задачи
  };
  reasoning: string;
}

/**
 * Анализирует запрос пользователя через DeepSeek
 */
async function analyzeUserIntent(
  userMessage: string,
  userId: string,
  sessionId: string
): Promise<DataAgentRequest> {
  const log = startAgentLog(userId, 'data_agent', 'analyze_intent', { userMessage }, sessionId);
  
  try {
    consoleLog('info', 'Data Agent: Analyzing user intent...', { userMessage });
    
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: DATA_AGENT_SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3, // Низкая температура для точности
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      const result = { action: 'unknown', filters: {}, reasoning: 'Empty response from AI' };
      await log.finish({ 
        outputData: result, 
        status: 'warning',
        modelUsed: 'deepseek-chat',
        tokensUsed: response.usage?.total_tokens || 0
      });
      return result as DataAgentRequest;
    }

    // Парсим JSON ответ
    const parsed: DataAgentRequest = JSON.parse(content);
    consoleLog('success', 'Data Agent intent recognized', { 
      action: parsed.action, 
      reasoning: parsed.reasoning 
    });
    
    await log.finish({
      outputData: parsed,
      status: 'success',
      modelUsed: 'deepseek-chat',
      tokensUsed: response.usage?.total_tokens || 0
    });
    
    return parsed;
  } catch (error: any) {
    consoleLog('error', 'Data Agent error', { error: error.message });
    
    const result = { action: 'unknown', filters: {}, reasoning: error.message };
    await log.finish({
      outputData: result,
      status: 'error',
      errorMessage: error.message
    });
    
    return result as DataAgentRequest;
  }
}

/**
 * Получает данные на основе анализа намерения
 */
async function fetchDataBasedOnIntent(
  userId: string,
  intent: DataAgentRequest,
  sessionId: string
): Promise<string> {
  const log = startAgentLog(userId, 'data_agent', 'fetch_data', { intent }, sessionId);
  
  try {
    // Инициализируем filters если их нет
    if (!intent.filters) {
      intent.filters = {};
    }

    // Применяем временной диапазон если указан
    if (intent.filters.date_range) {
      const dateRange = parseDateRange(intent.filters.date_range);
      intent.filters = { ...intent.filters, ...dateRange };
      consoleLog('data', 'Applied date range', { dateRange });
    }

    // Ограничиваем количество результатов
    if (!intent.filters.limit) {
      intent.filters.limit = 50;
    }

    consoleLog('info', `Executing ${intent.action}`, { filters: intent.filters, data: intent.data });
    
    let result: string;
    let rowsAffected = 0;
    
    // Если project_id содержит не UUID, а название - найти проект по имени
    if (intent.filters?.project_id && !isUUID(intent.filters.project_id)) {
      consoleLog('info', 'Searching project by name', { name: intent.filters.project_id });
      const { data: projects } = await getUserProjects(userId, {});
      const foundProject = projects?.find(p => 
        p.title?.toLowerCase().includes((intent.filters?.project_id || '').toLowerCase())
      );
      if (foundProject) {
        intent.filters.project_id = foundProject.id;
        consoleLog('success', 'Found project by name', { id: foundProject.id, title: foundProject.title });
      } else {
        result = `Проект "${intent.filters.project_id}" не найден.`;
        await log.finish({ outputData: { error: 'Project not found' }, status: 'warning' });
        return result;
      }
    }
    
    switch (intent.action) {
      case 'get_tasks': {
        const { data, error } = await getUserTasks(userId, intent.filters);
        if (error) {
          result = `Ошибка получения задач: ${error}`;
          await log.finish({ outputData: { error }, status: 'error', errorMessage: error });
          return result;
        }
        if (!data || data.length === 0) {
          result = 'У вас нет задач по этим критериям.';
          consoleLog('warning', 'No tasks found', { filters: intent.filters });
        } else {
          rowsAffected = data.length;
          result = formatTasksForAI(data);
          consoleLog('success', `Found ${data.length} tasks`);
        }
        break;
      }

      case 'get_projects': {
        const { data, error } = await getUserProjects(userId, intent.filters);
        if (error) {
          result = `Ошибка получения проектов: ${error}`;
          await log.finish({ outputData: { error }, status: 'error', errorMessage: error });
          return result;
        }
        if (!data || data.length === 0) {
          result = 'У вас нет проектов по этим критериям.';
          consoleLog('warning', 'No projects found', { filters: intent.filters });
        } else {
          rowsAffected = data.length;
          result = formatProjectsForAI(data);
          consoleLog('success', `Found ${data.length} projects`);
        }
        break;
      }

      case 'get_invoices': {
        const { data, error } = await getUserInvoices(userId, intent.filters);
        if (error) {
          result = `Ошибка получения счетов: ${error}`;
          await log.finish({ outputData: { error }, status: 'error', errorMessage: error });
          return result;
        }
        if (!data || data.length === 0) {
          result = 'У вас нет счетов по этим критериям.';
          consoleLog('warning', 'No invoices found', { filters: intent.filters });
        } else {
          rowsAffected = data.length;
          result = formatInvoicesForAI(data);
          consoleLog('success', `Found ${data.length} invoices`);
        }
        break;
      }

      case 'create_task': {
        if (!intent.data?.title) {
          result = 'Ошибка: не указано название задачи.';
          await log.finish({ outputData: { error: 'No title' }, status: 'error', errorMessage: 'Title required' });
          return result;
        }

        // Поиск проекта по имени если указан project_id но это не UUID
        let projectId = intent.data.project_id;
        if (projectId && !isUUID(projectId)) {
          consoleLog('info', `Searching project by name: ${projectId}`);
          const { data: projects } = await getUserProjects(userId, { limit: 50 });
          const foundProject = projects?.find((p: any) => 
            p.client_name?.toLowerCase().includes(projectId!.toLowerCase()) ||
            p.project_name?.toLowerCase().includes(projectId!.toLowerCase())
          );
          
          if (foundProject) {
            projectId = foundProject.id;
            consoleLog('success', `Project found: ${foundProject.client_name}`, { projectId });
          } else {
            consoleLog('warning', `Project "${projectId}" not found, creating task without project`);
            projectId = undefined;
          }
        }

        // Парсим дату если указана в свободной форме
        let dueDate = intent.data.due_date;
        if (dueDate && !dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const parsedDate = parseDateRange(dueDate);
          if (parsedDate.date_from) {
            dueDate = parsedDate.date_from;
          }
        }

        // 🚀 ИСПОЛЬЗУЕМ n8n для создания задачи (вместо прямого createTask)
        const { createTaskViaN8n, formatN8nResponseForAI } = await import('./n8n-ai-actions');
        
        // Получаем telegram_id пользователя для уведомления
        const { getUserTelegramId } = await import('./n8n-notifications');
        const telegramId = await getUserTelegramId(userId);

        const n8nResponse = await createTaskViaN8n(
          userId,
          {
            title: intent.data.title,
            description: intent.data.description,
            priority: intent.data.priority as any,
            status: intent.data.status || 'todo',
            project_id: projectId,
            due_date: dueDate,
          },
          telegramId || undefined
        );

        if (!n8nResponse.success) {
          result = `Ошибка создания задачи: ${n8nResponse.message || n8nResponse.error}`;
          await log.finish({ outputData: { error: n8nResponse.error }, status: 'error', errorMessage: n8nResponse.message });
          return result;
        }

        rowsAffected = 1;
        result = formatN8nResponseForAI(n8nResponse);
        consoleLog('success', 'Task created via n8n', { taskId: n8nResponse.task_id, notifications: n8nResponse.notifications_sent });
        break;
      }

      case 'update_task': {
        // Найти задачу для обновления
        let taskToUpdate: any = null;
        
        if (intent.data?.task_id) {
          // Прямой ID
          const { data: allTasks } = await getUserTasks(userId, { limit: 1000 });
          taskToUpdate = allTasks?.find((t: any) => t.id === intent.data!.task_id);
        } else if (intent.data?.title_contains) {
          // Поиск по названию
          const { data: allTasks } = await getUserTasks(userId, { limit: 1000 });
          taskToUpdate = allTasks?.find((t: any) => 
            t.title.toLowerCase().includes(intent.data!.title_contains!.toLowerCase())
          );
        } else if (intent.data?.target === 'last') {
          // Последняя задача
          const { data: allTasks } = await getUserTasks(userId, { limit: 1 });
          taskToUpdate = allTasks?.[0];
        } else if (intent.data?.target === 'first') {
          // Первая задача (самая старая)
          const { data: allTasks } = await getUserTasks(userId, { limit: 1000 });
          taskToUpdate = allTasks?.[allTasks.length - 1];
        }

        if (!taskToUpdate) {
          result = 'Задача не найдена. Уточните какую задачу нужно изменить.';
          await log.finish({ outputData: { error: 'Task not found' }, status: 'warning' });
          return result;
        }

        // Обновляем задачу
        const updates: any = {};
        if (intent.data?.priority !== undefined) updates.priority = intent.data.priority;
        if (intent.data?.status !== undefined) updates.status = intent.data.status;
        if (intent.data?.title !== undefined) updates.title = intent.data.title;
        if (intent.data?.description !== undefined) updates.description = intent.data.description;
        if (intent.data?.due_date !== undefined) updates.due_date = intent.data.due_date;
        if (intent.data?.project_id !== undefined) updates.project_id = intent.data.project_id;

        const { data: updatedTask, error } = await updateTask(userId, taskToUpdate.id, updates);

        if (error) {
          result = `Ошибка обновления задачи: ${error}`;
          await log.finish({ outputData: { error }, status: 'error', errorMessage: error });
          return result;
        }

        rowsAffected = 1;
        const quadrantMap: any = {1: 'UV (важно+срочно)', 2: 'V (важно)', 3: 'U (срочно)', 4: 'O (обычная)'};
        const quadrant = updatedTask?.priority === 1 && updatedTask?.status === 'in_progress' ? 1 
          : updatedTask?.priority === 1 && updatedTask?.status === 'todo' ? 2
          : updatedTask?.priority === 2 && updatedTask?.status === 'in_progress' ? 3 
          : 4;
        result = `✅ Задача обновлена:\n\nНазвание: ${updatedTask?.title}\nКвадрант: ${quadrantMap[quadrant]}`;
        consoleLog('success', 'Task updated', { taskId: updatedTask?.id });
        break;
      }

      default:
        result = 'Извините, я не понял что вы хотите. Попробуйте переформулировать вопрос.';
        await log.finish({ outputData: { message: result }, status: 'warning' });
        return result;
    }
    
    await log.finish({ 
      outputData: { rowsFound: rowsAffected, resultLength: result.length }, 
      rowsAffected,
      status: 'success' 
    });
    
    return result;
  } catch (error: any) {
    consoleLog('error', 'Error fetching data', { error: error.message });
    await log.finish({ status: 'error', errorMessage: error.message });
    return `Ошибка: ${error.message}`;
  }
}/**
 * Главная функция Data Agent - анализирует запрос и возвращает данные
 */
export async function runDataAgent(
  userId: string,
  userMessage: string
): Promise<{ data: string; intent: DataAgentRequest; sessionId: string }> {
  const startTime = Date.now();
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  consoleLog('info', '=== Data Agent Session Started ===', { sessionId, userMessage });
  
  // Шаг 1: Анализируем намерение
  const intent = await analyzeUserIntent(userMessage, userId, sessionId);
  
  // Шаг 2: Если намерение не связано с данными - возвращаем пустой результат
  if (intent.action === 'unknown') {
    consoleLog('warning', 'Unknown intent - no data to fetch', { intent });
    return {
      data: '',
      intent,
      sessionId
    };
  }

  // Шаг 3: Извлекаем данные
  const data = await fetchDataBasedOnIntent(userId, intent, sessionId);
  
  const elapsed = Date.now() - startTime;
  consoleLog('success', `Data Agent completed in ${elapsed}ms`, { 
    action: intent.action,
    dataLength: data.length 
  });
  
  return { data, intent, sessionId };
}
