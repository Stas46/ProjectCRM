/**
 * Data Agent - анализирует запросы пользователя и извлекает нужные данные
 * Использует DeepSeek для определения намерений
 */

import OpenAI from 'openai';
import {
  getUserTasks,
  getUserProjects,
  getUserInvoices,
  formatTasksForAI,
  formatProjectsForAI,
  formatInvoicesForAI,
  parseDateRange,
  type DataQueryFilters
} from './crm-data-tools';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com'
});

// Системный промпт для Data Agent
const DATA_AGENT_SYSTEM_PROMPT = `
Ты - специалист по извлечению данных из CRM-системы для остекления и алюминиевых конструкций.

Доступные данные:
1. **tasks** (задачи):
   - Статусы: pending (ожидает), in_progress (в работе), completed (завершена), cancelled (отменена)
   - Приоритеты: low, medium, high
   - Поля: title, description, status, priority, project_id, assigned_to, due_date

2. **projects** (проекты):
   - Статусы: draft (черновик), active (активный), completed (завершен), cancelled (отменен)
   - Приоритеты: low, medium, high
   - Поля: title, client_name, client_phone, status, priority, deadline, total_cost

3. **invoices** (счета):
   - Поля: invoice_number, supplier_name, invoice_date, total_amount, paid_status, project_id

Твоя задача: проанализировать вопрос пользователя и вернуть JSON с параметрами запроса.

Формат ответа:
{
  "action": "get_tasks" | "get_projects" | "get_invoices" | "unknown",
  "filters": {
    "status": "pending" | "in_progress" | "completed" | ...,
    "priority": "low" | "medium" | "high",
    "date_range": "today" | "this_week" | "this_month",
    "paid_status": true | false,
    "limit": number
  },
  "reasoning": "краткое объяснение что понял из запроса"
}

Примеры:

Вопрос: "Какие у меня задачи на этой неделе?"
Ответ: {"action": "get_tasks", "filters": {"date_range": "this_week", "limit": 50}, "reasoning": "Пользователь хочет увидеть задачи текущей недели"}

Вопрос: "Покажи активные проекты"
Ответ: {"action": "get_projects", "filters": {"status": "active"}, "reasoning": "Нужны проекты со статусом active"}

Вопрос: "Сколько неоплаченных счетов?"
Ответ: {"action": "get_invoices", "filters": {"paid_status": false}, "reasoning": "Запрос на счета, которые еще не оплачены"}

Вопрос: "Срочные задачи"
Ответ: {"action": "get_tasks", "filters": {"priority": "high", "status": "pending"}, "reasoning": "Задачи с высоким приоритетом, которые еще не начаты"}

Если не понял запрос - верни:
{"action": "unknown", "filters": {}, "reasoning": "не могу определить что нужно"}

ВАЖНО: отвечай ТОЛЬКО валидным JSON, без дополнительного текста.
`.trim();

export interface DataAgentRequest {
  action: 'get_tasks' | 'get_projects' | 'get_invoices' | 'unknown';
  filters: DataQueryFilters & { date_range?: string; paid_status?: boolean };
  reasoning: string;
}

/**
 * Анализирует запрос пользователя через DeepSeek
 */
async function analyzeUserIntent(userMessage: string): Promise<DataAgentRequest> {
  try {
    console.log('🤖 Data Agent: Analyzing user intent...');
    
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
      return { action: 'unknown', filters: {}, reasoning: 'Empty response from AI' };
    }

    // Парсим JSON ответ
    const parsed: DataAgentRequest = JSON.parse(content);
    console.log('✅ Data Agent intent:', parsed.action, '|', parsed.reasoning);
    
    return parsed;
  } catch (error: any) {
    console.error('❌ Data Agent error:', error.message);
    return { action: 'unknown', filters: {}, reasoning: error.message };
  }
}

/**
 * Получает данные на основе анализа намерения
 */
async function fetchDataBasedOnIntent(
  userId: string,
  intent: DataAgentRequest
): Promise<string> {
  try {
    // Применяем временной диапазон если указан
    if (intent.filters.date_range) {
      const dateRange = parseDateRange(intent.filters.date_range);
      intent.filters = { ...intent.filters, ...dateRange };
    }

    // Ограничиваем количество результатов
    if (!intent.filters.limit) {
      intent.filters.limit = 50;
    }

    switch (intent.action) {
      case 'get_tasks': {
        const { data, error } = await getUserTasks(userId, intent.filters);
        if (error) return `Ошибка получения задач: ${error}`;
        if (!data || data.length === 0) return 'У вас нет задач по этим критериям.';
        return formatTasksForAI(data);
      }

      case 'get_projects': {
        const { data, error } = await getUserProjects(userId, intent.filters);
        if (error) return `Ошибка получения проектов: ${error}`;
        if (!data || data.length === 0) return 'У вас нет проектов по этим критериям.';
        return formatProjectsForAI(data);
      }

      case 'get_invoices': {
        const { data, error } = await getUserInvoices(userId, intent.filters);
        if (error) return `Ошибка получения счетов: ${error}`;
        if (!data || data.length === 0) return 'У вас нет счетов по этим критериям.';
        return formatInvoicesForAI(data);
      }

      default:
        return 'Извините, я не понял что вы хотите узнать. Попробуйте переформулировать вопрос.';
    }
  } catch (error: any) {
    console.error('❌ Error fetching data:', error);
    return `Ошибка: ${error.message}`;
  }
}

/**
 * Главная функция Data Agent - анализирует запрос и возвращает данные
 */
export async function runDataAgent(
  userId: string,
  userMessage: string
): Promise<{ data: string; intent: DataAgentRequest }> {
  const startTime = Date.now();
  
  // Шаг 1: Анализируем намерение
  const intent = await analyzeUserIntent(userMessage);
  
  // Шаг 2: Если намерение не связано с данными - возвращаем пустой результат
  if (intent.action === 'unknown') {
    return {
      data: '',
      intent
    };
  }

  // Шаг 3: Извлекаем данные
  const data = await fetchDataBasedOnIntent(userId, intent);
  
  const elapsed = Date.now() - startTime;
  console.log(`⏱️ Data Agent completed in ${elapsed}ms`);
  
  return { data, intent };
}
