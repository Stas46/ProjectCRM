/**
 * Data Agent - анализирует запросы пользователя и извлекает нужные данные
 * Использует DeepSeek для определения намерений
 */

import OpenAI from 'openai';
import {
  getUserTasks,
  getUserProjects,
  getUserInvoices,
  getProjectBudgetStats,
  createTask,
  updateTask,
  formatTasksForAI,
  formatProjectsForAI,
  formatInvoicesForAI,
  parseDateRange,
  createTasksSummary,
  type DataQueryFilters
} from './crm-data-tools';
import { startAgentLog, consoleLog } from './agent-logger';

// Утилита для проверки UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Хранилище контекста диалога (в памяти)
interface DialogContext {
  userId: string;
  lastProjects: Array<{ id: string; name: string }>;
  lastInvoices: Array<{ id: string; number: string }>;
  lastTasks: Array<{ id: string; title: string }>;
  lastUpdated: Date;
}

const contextStore = new Map<string, DialogContext>();

// Максимальное время жизни контекста (30 минут)
const CONTEXT_TTL = 30 * 60 * 1000;

// Сохранить контекст
function saveContext(userId: string, updates: Partial<Omit<DialogContext, 'userId' | 'lastUpdated'>>) {
  const existing = contextStore.get(userId) || {
    userId,
    lastProjects: [],
    lastInvoices: [],
    lastTasks: [],
    lastUpdated: new Date()
  };
  
  contextStore.set(userId, {
    ...existing,
    ...updates,
    lastUpdated: new Date()
  });
  
  consoleLog('info', 'Context saved', { userId, context: updates });
}

// Получить контекст
function getContext(userId: string): DialogContext | null {
  const context = contextStore.get(userId);
  if (!context) return null;
  
  // Проверяем TTL
  if (Date.now() - context.lastUpdated.getTime() > CONTEXT_TTL) {
    contextStore.delete(userId);
    consoleLog('info', 'Context expired', { userId });
    return null;
  }
  
  return context;
}

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com'
});

// Системный промпт для Data Agent
const DATA_AGENT_SYSTEM_PROMPT = `
Ты - ассистент CRM-системы для остекления и алюминиевых конструкций.

ТЕКУЩАЯ ДАТА: ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Доступные действия:
1. **get_tasks** - получить/показать/найти задачи, создать саммари по задачам
2. **get_projects** - получить/показать проекты, показать заметки и детали
3. **get_invoices** - получить/показать счета по проекту/категории/поставщику
4. **get_budget** - показать бюджет проекта, расходы по категориям, остаток
5. **create_task** - создать/добавить/напомнить задачу
6. **update_task** - изменить/обновить/переместить задачу

ВАЖНО: Если пользователь просит СОЗДАТЬ/ДОБАВИТЬ/НАПОМНИТЬ - используй create_task!
Если ИЗМЕНИТЬ/ОБНОВИТЬ/ПЕРЕМЕСТИТЬ/ПОСТАВИТЬ ПРИОРИТЕТ - используй update_task!

Формат ответа JSON:
{
  "action": "get_tasks" | "get_budget" | "create_task" | "update_task" | "get_projects" | "get_invoices" | "unknown",
  "filters": {...},  // только для get_*
  "data": {...},     // для create_* и update_*
  "reasoning": "что понял",
  "context_project": "название проекта", // если в диалоге упоминался проект
  "need_summary": true // если нужно саммари по задачам
}

КОНТЕКСТ ДИАЛОГА - КРИТИЧЕСКИ ВАЖНО:
1. ЗАПОМИНАЙ последние 2-3 упомянутых проекта, счета, задачи
2. Если пользователь спрашивает про "этот/тот/такой/его/последний" - ищи в ПРЕДЫДУЩИХ сообщениях
3. "сколько потратили на профиль" - фильтруй счета по category="профиль"
4. "счета от Проведал" - фильтруй по supplier_name="Проведал"
5. "бюджет проекта" / "сколько осталось" → action: "get_budget"
6. "что покупали у поставщика" - показывай category и items из счетов
7. "саммари по задачам" / "итог" / "статус" → need_summary: true

УМНЫЙ ПОИСК ПО НАЗВАНИЯМ:
- Используй ЧАСТИЧНОЕ совпадение: "южное" → найти все с "Южное шоссе"
- "тсж" / "ТСЖ" / "окно тсж" → "Окно ТСЖ"
- "школа" → найти проект "Школа" 
- Игнорируй регистр и лишние пробелы

КАТЕГОРИИ ТОВАРОВ (для фильтрации счетов):
- "профиль" / "профиля" - алюминиевый профиль
- "фурнитура" - ручки, петли, замки
- "стекло" / "стеклопакет"
- "уплотнитель" / "резина"
- "крепёж" / "саморезы"

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

Примеры ЧТЕНИЯ с КОНТЕКСТОМ:
"какие задачи?" → {"action": "get_tasks", "filters": {}, "reasoning": "Показать задачи"}

"покажи срочные задачи" → {"action": "get_tasks", "filters": {"status": "in_progress"}, "reasoning": "Срочные"}

"саммари по задачам" → {"action": "get_tasks", "filters": {}, "need_summary": true, "reasoning": "Создать саммари"}

"список проектов" → {"action": "get_projects", "filters": {}, "reasoning": "Показать проекты"}

"задачи по южному шоссе" → {"action": "get_tasks", "filters": {"project_name": "южное шоссе"}, "reasoning": "Частичный поиск проекта", "context_project": "Южное шоссе"}

"какой цвет конструкций в ТСЖ" → {"action": "get_projects", "filters": {"project_name": "окно тсж"}, "reasoning": "Детали проекта из контекста", "context_project": "Окно ТСЖ"}

"бюджет проекта школа" → {"action": "get_budget", "filters": {"project_name": "школа"}, "reasoning": "Статистика по бюджету", "context_project": "Школа"}

"сколько потратили на профиль" → {"action": "get_invoices", "filters": {"category": "профиль"}, "reasoning": "Счета по категории профиль"}

"счета от Проведал" → {"action": "get_invoices", "filters": {"supplier_name": "Проведал"}, "reasoning": "Счета от поставщика"}

"что покупали у Проведал" → {"action": "get_invoices", "filters": {"supplier_name": "Проведал"}, "reasoning": "Детали покупок у поставщика"}

"счета по этому проекту" → {"action": "get_invoices", "filters": {"project_id": "из контекста"}, "reasoning": "Используем проект из диалога"}

ВАЖНО: отвечай ТОЛЬКО валидным JSON.
`.trim();

export interface DataAgentRequest {
  action: 'get_tasks' | 'get_projects' | 'get_invoices' | 'get_budget' | 'create_task' | 'update_task' | 'unknown';
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
  context_project?: string; // Название проекта из контекста диалога
  need_summary?: boolean; // Нужно ли создать саммари по задачам
}

/**
 * Анализирует запрос пользователя через DeepSeek с учётом контекста
 */
async function analyzeUserIntent(
  userMessage: string,
  userId: string,
  sessionId: string
): Promise<DataAgentRequest> {
  const log = startAgentLog(userId, 'data_agent', 'analyze_intent', { userMessage }, sessionId);
  
  try {
    consoleLog('info', 'Data Agent: Analyzing user intent...', { userMessage });
    
    // Получаем контекст диалога
    const context = getContext(userId);
    let contextMessage = '';
    
    if (context) {
      contextMessage = '\n\nКОНТЕКСТ ДИАЛОГА:\n';
      if (context.lastProjects.length > 0) {
        contextMessage += `Последние упомянутые проекты: ${context.lastProjects.map(p => p.name).join(', ')}\n`;
      }
      if (context.lastInvoices.length > 0) {
        contextMessage += `Последние счета: ${context.lastInvoices.map(i => i.number).join(', ')}\n`;
      }
      if (context.lastTasks.length > 0) {
        contextMessage += `Последние задачи: ${context.lastTasks.map(t => t.title).join(', ')}\n`;
      }
    }
    
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: DATA_AGENT_SYSTEM_PROMPT },
        { role: 'user', content: userMessage + contextMessage }
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
          
          // Сохраняем задачи в контекст
          saveContext(userId, {
            lastTasks: data.slice(0, 3).map(t => ({ id: t.id, title: t.title }))
          });
          
          // Если нужно саммари - создаём его
          if (intent.need_summary) {
            result = createTasksSummary(data);
            consoleLog('success', `Created summary for ${data.length} tasks`);
          } else {
            result = formatTasksForAI(data);
            consoleLog('success', `Found ${data.length} tasks`);
          }
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
          
          // Сохраняем проекты в контекст
          saveContext(userId, {
            lastProjects: data.slice(0, 3).map(p => ({ 
              id: p.id, 
              name: p.project_name || p.title || 'Без названия' 
            }))
          });
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
          
          // Сохраняем счета в контекст
          saveContext(userId, {
            lastInvoices: data.slice(0, 3).map(i => ({ 
              id: i.id, 
              number: i.invoice_number 
            }))
          });
          
          // Группируем по категориям если есть
          const byCategory = data.reduce((acc, inv) => {
            const cat = inv.category || 'Без категории';
            if (!acc[cat]) acc[cat] = { total: 0, count: 0, items: [] };
            acc[cat].total += inv.total_amount || 0;
            acc[cat].count += 1;
            if (inv.items) acc[cat].items.push(inv.items);
            return acc;
          }, {} as Record<string, { total: number; count: number; items: string[] }>);
          
          result = formatInvoicesForAI(data);
          
          // Добавляем сводку по категориям
          if (Object.keys(byCategory).length > 1) {
            result += '\n\n📊 ПО КАТЕГОРИЯМ:\n';
            Object.entries(byCategory).forEach(([cat, info]) => {
              result += `${cat}: ${info.count} шт. на ${info.total.toLocaleString('ru-RU')} ₽\n`;
            });
          }
          
          consoleLog('success', `Found ${data.length} invoices`);
        }
        break;
      }

      case 'get_budget': {
        // Найти проект сначала
        let projectId = intent.filters?.project_id;
        
        if (!projectId || !isUUID(projectId)) {
          const projectName = intent.filters?.project_name || intent.filters?.project_id || '';
          consoleLog('info', 'Searching project for budget', { projectName });
          
          const { data: projects } = await getUserProjects(userId, { 
            project_name: projectName,
            limit: 1 
          });
          
          if (!projects || projects.length === 0) {
            result = `Проект "${projectName}" не найден.`;
            await log.finish({ outputData: { error: 'Project not found' }, status: 'warning' });
            return result;
          }
          
          projectId = projects[0].id;
        }
        
        const { data: budgetData, error } = await getProjectBudgetStats(projectId);
        
        if (error || !budgetData) {
          result = `Ошибка получения статистики по бюджету: ${error}`;
          await log.finish({ outputData: { error }, status: 'error', errorMessage: error || 'Unknown' });
          return result;
        }
        
        const proj = budgetData.project;
        result = `💰 БЮДЖЕТ ПРОЕКТА "${proj.project_name || proj.title}"\n\n`;
        result += `Бюджет: ${budgetData.budget.toLocaleString('ru-RU')} ₽\n`;
        result += `Потрачено: ${budgetData.spent.toLocaleString('ru-RU')} ₽\n`;
        result += `Остаток: ${budgetData.remaining.toLocaleString('ru-RU')} ₽\n`;
        result += `Прогресс: ${((budgetData.spent / budgetData.budget) * 100).toFixed(1)}%\n\n`;
        
        result += `📋 Счета: ${budgetData.total_invoices} шт.\n`;
        result += `✅ Оплачено: ${budgetData.paid_invoices} шт.\n`;
        result += `❌ Не оплачено: ${budgetData.unpaid_invoices} шт.\n\n`;
        
        if (budgetData.invoices_by_category.length > 0) {
          result += '📊 ПО КАТЕГОРИЯМ:\n';
          budgetData.invoices_by_category
            .sort((a, b) => b.total - a.total)
            .forEach(cat => {
              result += `• ${cat.category}: ${cat.count} шт. на ${cat.total.toLocaleString('ru-RU')} ₽\n`;
            });
          result += '\n';
        }
        
        if (budgetData.invoices_by_supplier.length > 0) {
          result += '🏢 ПО ПОСТАВЩИКАМ:\n';
          budgetData.invoices_by_supplier
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .forEach(sup => {
              result += `• ${sup.supplier}: ${sup.count} шт. на ${sup.total.toLocaleString('ru-RU')} ₽\n`;
            });
        }
        
        if (proj.notes) {
          result += `\n📝 Заметки:\n${proj.notes}\n`;
        }
        
        rowsAffected = budgetData.total_invoices;
        consoleLog('success', 'Budget stats retrieved', { projectId, spent: budgetData.spent });
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

        // Создаём задачу напрямую в БД
        const taskResult = await createTask(userId, {
          title: intent.data.title,
          description: intent.data.description,
          priority: intent.data.priority as any,
          status: intent.data.status || 'todo',
          project_id: projectId,
          due_date: dueDate,
        });

        if (!taskResult.data) {
          result = `Ошибка создания задачи: ${taskResult.error}`;
          await log.finish({ outputData: { error: taskResult.error }, status: 'error', errorMessage: 'Create failed' });
          return result;
        }

        const newTask = taskResult.data;

        // Отправляем уведомление через n8n
        const { getUserTelegramId, notifyTaskCreated } = await import('./n8n-notifications');
        const telegramId = await getUserTelegramId(userId);
        
        if (telegramId) {
          await notifyTaskCreated(
            {
              id: newTask.id,
              title: newTask.title,
              priority: newTask.priority,
              deadline: newTask.due_date,
            },
            telegramId,
            userId
          );
          consoleLog('success', 'Telegram notification sent', { taskId: newTask.id });
        }

        rowsAffected = 1;
        result = `✅ Создал задачу "${newTask.title}"${telegramId ? '\n📱 Уведомление отправлено' : ''}`;
        consoleLog('success', 'Task created', { taskId: newTask.id });
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
