/**
 * Personal Assistant Agent
 * Расширенный AI агент с проактивными диалогами и личным контекстом
 */

import OpenAI from 'openai';
import { supabase } from './supabase';
import {
  getUserProfile,
  getFamilyMembers,
  getUpcomingEvents,
  getContext,
  saveContext,
  createProactiveAction,
  formatEventsForAI,
  formatFamilyForAI,
  getNextBirthday,
  type UserProfile,
  type FamilyMember
} from './personal-data-tools';
import {
  getWeather,
  calculateRoute,
  getTrafficLevel,
  formatWeatherForAI,
  formatRouteForAI,
  getClothingAdvice,
  calculateDepartureTime,
  geocodeAddress
} from './personal-assistant-services';
import {
  getUserTasks,
  getUserProjects,
  getUserInvoices,
  getFullProjectInfo,
  createTask,
  updateTask,
  searchAllData
} from './crm-data-tools';
import { startAgentLog, consoleLog } from './agent-logger';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com'
});

// OpenAI как резервный вариант
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
});

// Функция для вызова LLM с fallback
async function callLLM(messages: any[], options: { maxTokens?: number } = {}) {
  const maxTokens = options.maxTokens || 1000;
  
  // Пробуем DeepSeek
  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature: 0.1,
      max_tokens: maxTokens,
    });
    return response.choices[0].message.content || '';
  } catch (deepseekError: any) {
    console.error('❌ DeepSeek error, trying OpenAI fallback:', deepseekError.message || deepseekError);
    
    // Fallback на OpenAI
    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.1,
        max_tokens: maxTokens,
      });
      console.log('✅ OpenAI fallback successful');
      return response.choices[0].message.content || '';
    } catch (openaiError: any) {
      console.error('❌ OpenAI fallback also failed:', openaiError.message || openaiError);
      throw new Error('Both DeepSeek and OpenAI failed');
    }
  }
}

// ============================================
// СИСТЕМНЫЙ ПРОМПТ
// ============================================

const PERSONAL_ASSISTANT_SYSTEM_PROMPT = `
Ты - личный ИИ-помощник пользователя. Зовут тебя как пользователь захочет.

ТЕКУЩАЯ ДАТА: ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

ТВОЯ РОЛЬ:
1. Помогаешь с рабочими задачами (CRM, проекты, счета)
2. Помогаешь с личными делами (семья, события, подарки)
3. Даёшь советы по погоде, пробкам, маршрутам
4. Запоминаешь важную информацию о пользователе
5. Проактивно спрашиваешь и напоминаешь о важном

РАСПОЗНАВАНИЕ ЗАПРОСОВ - КЛЮЧЕВЫЕ СЛОВА:

**CRM (всегда используй get_tasks/get_projects/get_invoices):**
- "какие проекты", "покажи проекты", "мои проекты", "список проектов" → get_projects
- "какие задачи", "покажи задачи", "мои задачи", "что делать" → get_tasks
- "какие счета", "покажи счета", "счета", "инвойсы" → get_invoices
- "найди [что-то]" → search_data

**Погода (всегда используй get_weather):**
- "какая погода", "погода", "температура", "на улице" → get_weather

**ЗАПРЕЩЕНО использовать ask_question для:**
- ❌ "какие проекты?" → get_projects (НЕ ask_question!)
- ❌ "какие задачи?" → get_tasks (НЕ ask_question!)
- ❌ "какая погода?" → get_weather (НЕ ask_question!)
- ❌ Любые прямые вопросы про CRM данные

**ask_question используй ТОЛЬКО когда:**
- ✅ Нужна недостающая информация: "где работает жена?", "когда ДР?"
- ✅ Проактивное предложение: "хочешь автоматическое утро?"
- ✅ Уточнение некорректного запроса пользователя

ДОСТУПНЫЕ ДЕЙСТВИЯ:

**Рабочие (CRM):**
- get_tasks - задачи
- get_projects - проекты
- get_invoices - счета
- get_budget - бюджет проекта
- get_full_project - вся информация о проекте
- search_data - поиск по CRM
- get_analytics - аналитика расходов
- create_task - создать ОДНУ задачу (data.title обязательно)
- create_multiple_tasks - создать НЕСКОЛЬКО задач (data.tasks: [{title, priority?, description?}, ...])
- update_task - обновить задачу

**Личные:**
- get_weather - погода сейчас и прогноз
- get_route - маршрут и время в пути
- calculate_departure - рассчитать когда выезжать чтобы быть в X к Y времени
- set_reminder - установить напоминание. Параметры:
  * data.message - текст напоминания
  * data.time - время в формате "HH:MM" (например "10:30")
  * data.date - "today" или "tomorrow" (по умолчанию today)
  * data.task_ids - массив ID задач для напоминания (опционально)
- get_traffic - уровень пробок
- get_family - информация о семье
- get_events - предстоящие события
- suggest_gift - идеи подарков
- add_family_member - добавить члена семьи
- add_event - добавить событие
- save_preference - запомнить предпочтение

**Проактивные:**
- ask_question - задать вопрос пользователю
- morning_brief - утренний брифинг
- remind_event - напомнить о событии

ПРОАКТИВНОЕ ПОВЕДЕНИЕ - ОЧЕНЬ ВАЖНО!

1. **СПРАШИВАЙ САМ**, если:
   - Не знаешь важную информацию (где живёт, где работает, есть ли семья)
   - Пользователь упоминает жену/детей, но они не в базе
   - Близится событие (ДР через неделю) - спроси про подарок
   - Пользователь часто спрашивает погоду - предложи автоматическое утро

2. **ЗАПОМИНАЙ** всё важное:
   - Имена близких и их ДР
   - Адреса (дом, работа)
   - Предпочтения ("не люблю рано вставать", "люблю кофе")
   - Паттерны ("всегда спрашивает про проект Школа")

3. **ИНИЦИАТИВА**:
   - Утром: "Доброе утро! Хочешь погоду и план на день?"
   - За неделю до ДР: "Скоро ДР у жены, давай придумаем подарок?"
   - Перед встречей: "Встреча в 15:00, сколько ехать от офиса?"

ФОРМАТ ОТВЕТА JSON:
{
  "action": "get_weather" | "get_route" | "get_family" | "ask_question" | "save_preference" | ...,
  "filters": {...},
  "data": {...},
  "reasoning": "что понял и почему делаю это",
  "proactive_question": "вопрос пользователю" (если нужно что-то уточнить),
  "memory_to_save": {"key": "value"} (что запомнить)
}

ПРИМЕРЫ ДИАЛОГОВ:

**ВАЖНО: Когда знаешь ответ - отвечай сразу!**
👤: как меня зовут?
🤖: {
  "action": "chat",
  "data": { "answer": "Тебя зовут Станислав!" },
  "reasoning": "Знаю имя из профиля - просто отвечаю"
}

👤: где я живу?
🤖: {
  "action": "chat",
  "data": { "answer": "Ты живёшь в Санкт-Петербурге." },
  "reasoning": "Знаю город из профиля - отвечаю"
}

👤: кто моя жена?
🤖: {
  "action": "chat",
  "data": { "answer": "Твою жену зовут Наталья. Хочешь что-то о ней узнать или напомнить о дне рождения?" },
  "reasoning": "Знаю из базы семьи - отвечаю и предлагаю помощь"
}

**CRM запросы:**
👤: какие у меня проекты?
🤖: {
  "action": "get_projects",
  "filters": {},
  "reasoning": "Пользователь спрашивает про проекты - показываю список из CRM"
}

👤: какие задачи?
🤖: {
  "action": "get_tasks",
  "filters": {},
  "reasoning": "Показать задачи пользователя"
}

👤: покажи только активные задачи
🤖: {
  "action": "get_tasks",
  "filters": { "status": "in_progress" },
  "reasoning": "Показать только задачи со статусом 'в работе'"
}

👤: мне нужны только активные задачи
🤖: {
  "action": "get_tasks",
  "filters": { "status": "in_progress" },
  "reasoning": "Фильтрация по статусу - только активные (in_progress)"
}

👤: какие задачи не выполнены?
🤖: {
  "action": "get_tasks",
  "filters": { "exclude_done": true },
  "reasoning": "Показать задачи кроме выполненных"
}

👤: 3 задача отметь выполнена
🤖: {
  "action": "update_task",
  "data": { "task_index": 3, "status": "done" },
  "reasoning": "Пользователь просит отметить задачу #3 как выполненную"
}

👤: задачу 5 пометь готово
🤖: {
  "action": "update_task",
  "data": { "task_index": 5, "status": "done" },
  "reasoning": "Отметить задачу #5 выполненной"
}

👤: первую задачу в работу
🤖: {
  "action": "update_task",
  "data": { "task_index": 1, "status": "in_progress" },
  "reasoning": "Изменить статус задачи #1 на 'в работе'"
}

👤: покажи счета
🤖: {
  "action": "get_invoices",
  "filters": {},
  "reasoning": "Показать все счета из CRM"
}

👤: покажи последний счёт
🤖: {
  "action": "get_invoices",
  "filters": { "limit": 1 },
  "reasoning": "Показать только последний загруженный счёт"
}

👤: счета на профиль
🤖: {
  "action": "get_invoices",
  "filters": { "search_items": "профиль" },
  "reasoning": "Искать счета где в товарах упоминается 'профиль'"
}

👤: у кого мы покупали профиль
🤖: {
  "action": "get_invoices",
  "filters": { "search_items": "профиль" },
  "reasoning": "Найти счета с профилем, чтобы показать поставщиков"
}

👤: что мы покупали у Алютех
🤖: {
  "action": "get_invoices",
  "filters": { "supplier_name": "Алютех" },
  "reasoning": "Показать счета от поставщика Алютех"
}

👤: найди проект школа
🤖: {
  "action": "search_data",
  "data": { "query": "школа" },
  "reasoning": "Поиск по ключевому слову 'школа' в CRM"
}

**Проактивные вопросы:**
👤: Завтра еду к жене на работу
🤖: {
  "action": "ask_question",
  "data": {
    "question": "А где работает твоя жена? Если скажешь адрес, смогу рассчитывать маршруты и предупреждать о пробках.",
    "topic": "wife_work_address"
  },
  "reasoning": "Не знаю адрес работы жены, нужно спросить и запомнить"
}

👤: У дочки скоро ДР
🤖: {
  "action": "ask_question",
  "data": {
    "question": "Когда именно день рождения у дочки? И сколько ей будет лет? Запишу, чтобы напомнить заранее.",
    "topic": "daughter_birthday"
  },
  "reasoning": "Пользователь упомянул дочку, но её нет в базе семьи"
}

**Погода и маршруты:**
👤: Какая погода?
🤖: {
  "action": "get_weather",
  "filters": {},
  "reasoning": "Показать погоду",
  "memory_to_save": {
    "pattern_weather_check": "user often asks weather in morning",
    "last_weather_request": "2025-11-27T08:30:00"
  }
}

👤: сколько ехать до дома?
🤖: {
  "action": "get_route",
  "data": { "to": "home" },
  "reasoning": "Пользователь спрашивает маршрут до дома. to=home означает домашний адрес. from не указан - значит едет от текущей позиции."
}

👤: сколько ехать до работы?
🤖: {
  "action": "get_route",
  "data": { "to": "work" },
  "reasoning": "Пользователь спрашивает маршрут до работы. to=work означает рабочий адрес. from не указан - используется текущая геолокация."
}

👤: сколько мне ехать до работы
🤖: {
  "action": "get_route",
  "data": { "to": "work" },
  "reasoning": "Маршрут до работы от текущей позиции"
}

👤: сколько ехать от дома до работы?
🤖: {
  "action": "get_route",
  "data": { "from": "home", "to": "work" },
  "reasoning": "Маршрут от дома до работы"
}

👤: как добраться до Невского проспекта?
🤖: {
  "action": "get_route",
  "data": { "to": "Невский проспект, Санкт-Петербург" },
  "reasoning": "Маршрут до конкретного адреса от текущей позиции"
}

👤: сколько ехать до Пулково?
🤖: {
  "action": "get_route",
  "data": { "to": "Аэропорт Пулково, Санкт-Петербург" },
  "reasoning": "Маршрут до аэропорта"
}

👤: мне надо быть дома в 17:15, когда выезжать?
🤖: {
  "action": "calculate_departure",
  "data": { "to": "home", "arrival_time": "17:15" },
  "reasoning": "Пользователь хочет знать когда выехать, чтобы успеть домой к 17:15"
}

👤: во сколько выехать чтобы быть на работе в 9?
🤖: {
  "action": "calculate_departure",
  "data": { "to": "work", "arrival_time": "09:00" },
  "reasoning": "Расчёт времени выезда до работы"
}

**Напоминания:**
👤: напомни через 15 минут заказать кронштейны
🤖: {
  "action": "set_reminder",
  "data": { "minutes": 15, "message": "заказать кронштейны" },
  "reasoning": "Пользователь просит напомнить через 15 минут"
}

👤: напомни в 18:00 позвонить жене
🤖: {
  "action": "set_reminder",
  "data": { "time": "18:00", "message": "позвонить жене" },
  "reasoning": "Напоминание на конкретное время"
}

👤: напомни завтра в 9 утра про встречу
🤖: {
  "action": "set_reminder",
  "data": { "date": "tomorrow", "time": "09:00", "message": "встреча" },
  "reasoning": "Напоминание на завтра"
}

**Создание НЕСКОЛЬКИХ задач:**
👤: Поставь мне задачи на завтра: срочно заказать стекло, позвонить Иванову, подготовить КП
🤖: {
  "action": "create_multiple_tasks",
  "data": {
    "tasks": [
      { "title": "Заказать стекло", "priority": "high" },
      { "title": "Позвонить Иванову", "priority": "medium" },
      { "title": "Подготовить КП", "priority": "medium" }
    ]
  },
  "reasoning": "Пользователь перечислил несколько задач - создаю все сразу"
}

👤: Мои задачи: проверить почту, ответить клиенту, заказать материалы
🤖: {
  "action": "create_multiple_tasks",
  "data": {
    "tasks": [
      { "title": "Проверить почту" },
      { "title": "Ответить клиенту" },
      { "title": "Заказать материалы" }
    ]
  },
  "reasoning": "Три задачи из списка пользователя"
}

**Напоминание о созданных задачах:**
👤: [сразу после создания задач] Напомни мне про эти задачи завтра в 10:30
🤖: {
  "action": "set_reminder",
  "data": { 
    "date": "tomorrow", 
    "time": "10:30", 
    "about_last_tasks": true 
  },
  "reasoning": "Пользователь просит напомнить про только что созданные задачи"
}

👤: [после создания 5 задач] Напомни про первые две задачи через час
🤖: {
  "action": "set_reminder",
  "data": { 
    "minutes": 60, 
    "about_last_tasks": true,
    "last_tasks_count": 2
  },
  "reasoning": "Напоминание о первых 2 задачах из последних созданных"
}

**Сохранение информации:**
👤: Санкт-Петербург, Ленина 10
🤖: {
  "action": "save_preference",
  "data": {
    "key": "home_address",
    "value": "Санкт-Петербург, Ленина 10"
  },
  "reasoning": "Пользователь назвал адрес, сохраняю как домашний",
  "proactive_question": "Это твой домашний адрес? Или рабочий?"
}

ЕСТЕСТВЕННОСТЬ:
- Общайся по-дружески, но уважительно
- Используй эмодзи в ответах (☀️🚗📅💡)
- Предлагай помощь: "Хочешь, помогу с этим?"
- Признавайся если не знаешь: "Не знаю где ты живёшь, подскажешь?"

ВАЖНО: всегда возвращай валидный JSON!
`.trim();

// ============================================
// ИНТЕРФЕЙСЫ
// ============================================

export interface PersonalAssistantRequest {
  action: 
    // Simple chat (AI knows the answer)
    | 'chat'
    // CRM actions
    | 'get_tasks' | 'get_projects' | 'get_invoices' | 'get_budget' 
    | 'get_full_project' | 'search_data' | 'get_analytics'
    | 'create_task' | 'create_multiple_tasks' | 'update_task'
    // Personal actions
    | 'get_weather' | 'get_route' | 'calculate_departure' | 'get_traffic'
    | 'get_family' | 'get_events' | 'suggest_gift'
    | 'add_family_member' | 'add_event'
    | 'save_preference' | 'set_reminder'
    // Proactive actions
    | 'ask_question' | 'morning_brief' | 'remind_event'
    | 'unknown';
  filters?: any;
  data?: any;
  reasoning: string;
  proactive_question?: string;
  memory_to_save?: Record<string, any>;
}

// ============================================
// АНАЛИЗ НАМЕРЕНИЯ
// ============================================

async function analyzePersonalIntent(
  userMessage: string,
  userId: string,
  sessionId: string,
  userProfile?: UserProfile | null,
  familyMembers?: FamilyMember[],
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<PersonalAssistantRequest> {
  const log = startAgentLog(userId, 'personal_assistant', 'analyze_intent', { userMessage }, sessionId);

  try {
    consoleLog('info', 'Personal Assistant: Analyzing intent...', { 
      userMessage,
      hasHistory: !!conversationHistory && conversationHistory.length > 0
    });

    // Получаем контекст диалога
    const { data: contextData } = await getContext(userId);
    let contextMessage = '';

    if (contextData && contextData.length > 0) {
      contextMessage = '\n\nКОНТЕКСТ О ПОЛЬЗОВАТЕЛЕ:\n';
      contextData.forEach(ctx => {
        contextMessage += `- ${ctx.key}: ${JSON.stringify(ctx.value)}\n`;
      });
    }

    // Добавляем информацию о профиле
    if (userProfile) {
      contextMessage += '\n\nПРОФИЛЬ:\n';
      if (userProfile.full_name) contextMessage += `Имя: ${userProfile.full_name}\n`;
      if (userProfile.home_address) contextMessage += `Дом: ${userProfile.home_address}\n`;
      if (userProfile.work_address) contextMessage += `Работа: ${userProfile.work_address}\n`;
    }

    // Добавляем информацию о семье
    if (familyMembers && familyMembers.length > 0) {
      contextMessage += '\n\nСЕМЬЯ:\n';
      familyMembers.forEach(m => {
        contextMessage += `- ${m.name} (${m.relation})`;
        if (m.birthday) contextMessage += ` - ДР ${new Date(m.birthday).toLocaleDateString('ru-RU')}`;
        contextMessage += '\n';
      });
    }

    // Формируем массив сообщений с историей
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: PERSONAL_ASSISTANT_SYSTEM_PROMPT }
    ];

    // Добавляем историю диалога если есть
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    // Последнее сообщение пользователя с контекстом
    messages.push({ 
      role: 'user', 
      content: userMessage + contextMessage 
    });

    const content = await callLLM(messages, { maxTokens: 1000 });
    consoleLog('info', '🤖 AI Raw Response:', { 
      userMessage,
      rawContent: content,
      contentLength: content.length 
    });

    // Парсим JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      consoleLog('error', '❌ No JSON found in AI response', { content });
      throw new Error('AI did not return valid JSON');
    }

    const intent: PersonalAssistantRequest = JSON.parse(jsonMatch[0]);
    consoleLog('info', '✅ Parsed intent:', { 
      action: intent.action,
      reasoning: intent.reasoning,
      hasData: !!intent.data,
      hasFilters: !!intent.filters
    });
    
    await log.finish({ outputData: intent, status: 'success' });
    return intent;

  } catch (error: any) {
    consoleLog('error', 'Error analyzing intent', { error: error.message });
    await log.finish({ status: 'error', errorMessage: error.message });
    
    return {
      action: 'unknown',
      reasoning: 'Ошибка анализа запроса',
      data: {}
    };
  }
}

// ============================================
// ВЫПОЛНЕНИЕ ДЕЙСТВИЙ
// ============================================

async function executePersonalAction(
  userId: string,
  intent: PersonalAssistantRequest,
  sessionId: string
): Promise<string> {
  const log = startAgentLog(userId, 'personal_assistant', 'execute_action', { action: intent.action }, sessionId);

  try {
    let result = '';

    switch (intent.action) {
      // ========== ПРОСТОЙ ОТВЕТ (без выполнения действий) ==========
      case 'chat': {
        // AI сам знает ответ - просто возвращаем его
        result = intent.data?.answer || intent.data?.message || 'Хм, что-то не так с моим ответом...';
        break;
      }

      // ========== ПОГОДА ==========
      case 'get_weather': {
        const { data: profile } = await getUserProfile(userId);
        const { data: contextList } = await getContext(userId);
        
        // Проверяем есть ли текущая геолокация
        const currentLocationCtx = contextList?.find(c => c.key === 'current_location');
        const currentLocation = currentLocationCtx?.value as { latitude: number; longitude: number; address: string } | undefined;
        
        let lat, lon;
        let locationNote = '';
        
        // Приоритет: текущая геолокация > профиль > Санкт-Петербург
        if (currentLocation) {
          lat = currentLocation.latitude;
          lon = currentLocation.longitude;
          locationNote = `\n\n📍 Погода для: ${currentLocation.address || 'твоя позиция'}`;
        } else if (!profile?.home_coordinates) {
          // Fallback на Санкт-Петербург если нет профиля
          lat = 59.9311;
          lon = 30.3609;
          locationNote = '\n\n💡 Показываю погоду для Санкт-Петербурга. Скажи свой адрес, чтобы я показывал погоду для твоего города.';
          consoleLog('info', '⚠️ No user coordinates, using St. Petersburg fallback');
        } else {
          lat = profile.home_coordinates.lat;
          lon = profile.home_coordinates.lon;
        }

        const { data: weather, error } = await getWeather(lat, lon);

        if (error || !weather) {
          result = `Ошибка получения погоды: ${error}`;
          break;
        }

        result = formatWeatherForAI(weather) + locationNote;
        result += '\n\n💡 ' + getClothingAdvice(weather);
        
        // Сохраняем в память что спросил погоду
        await saveContext(userId, 'pattern', 'weather_requests', {
          last_request: new Date().toISOString(),
          count: 1
        }, { ttlDays: 7 });

        break;
      }

      // ========== МАРШРУТ ==========
      case 'get_route': {
        const { data: profile } = await getUserProfile(userId);
        const { data: contextList } = await getContext(userId);
        
        // Проверяем есть ли текущая геолокация
        const currentLocationCtx = contextList?.find(c => c.key === 'current_location');
        const currentLocation = currentLocationCtx?.value as { latitude: number; longitude: number; address: string } | undefined;
        
        // Резолвим специальные значения "home" и "work"
        let rawFrom = intent.data?.from;
        let rawTo = intent.data?.to;
        
        // "home" → домашний адрес из профиля
        if (rawFrom === 'home') rawFrom = profile?.home_address;
        if (rawTo === 'home') rawTo = profile?.home_address;
        
        // "work" → рабочий адрес из профиля
        if (rawFrom === 'work') rawFrom = profile?.work_address;
        if (rawTo === 'work') rawTo = profile?.work_address;
        
        // Определяем откуда
        let fromAddress = rawFrom;
        let fromGeo: { lat: number; lon: number } | null = null;
        
        // Если from не указан и есть геолокация - используем её
        if (!fromAddress && currentLocation) {
          fromGeo = { lat: currentLocation.latitude, lon: currentLocation.longitude };
          fromAddress = currentLocation.address || 'Твоя позиция';
          consoleLog('info', '📍 Using current location as FROM', { fromAddress });
        }
        
        // Если from всё ещё не указан - пробуем домашний адрес
        if (!fromAddress) {
          fromAddress = profile?.home_address;
        }
        
        const toAddress = rawTo;

        if (!fromAddress || !toAddress) {
          // Подсказка в зависимости от того, чего не хватает
          if (!toAddress) {
            result = '❓ Куда тебе нужно ехать? Укажи адрес или место.';
          } else if (!fromAddress) {
            result = '❓ Откуда едем? Расшарь геолокацию или укажи адрес.\n\n💡 Или скажи где ты живёшь, чтобы я запомнил.';
          }
          break;
        }

        // Геокодируем адреса
        if (!fromGeo) {
          const { data: geo } = await geocodeAddress(fromAddress);
          fromGeo = geo;
        }
        const { data: toGeo } = await geocodeAddress(toAddress);

        if (!fromGeo || !toGeo) {
          result = 'Не смог найти один из адресов. Попробуй указать точнее.';
          break;
        }

        const { data: route, error } = await calculateRoute(
          fromGeo.lat, fromGeo.lon,
          toGeo.lat, toGeo.lon
        );

        if (error || !route) {
          result = `Ошибка расчёта маршрута: ${error}`;
          break;
        }

        result = formatRouteForAI(route, fromAddress, toAddress);

        // Если указано время прибытия
        if (intent.data?.arrival_time) {
          const durationMin = Math.ceil(route.duration_in_traffic / 60);
          const departureTime = calculateDepartureTime(intent.data.arrival_time, durationMin);
          result += `\n\n⏰ Чтобы приехать к ${intent.data.arrival_time}, выезжай в **${departureTime}**`;
        }

        break;
      }

      // ========== РАСЧЁТ ВРЕМЕНИ ВЫЕЗДА ==========
      case 'calculate_departure': {
        const { data: profile } = await getUserProfile(userId);
        const { data: contextList } = await getContext(userId);
        
        // Проверяем текущую геолокацию
        const currentLocationCtx = contextList?.find(c => c.key === 'current_location');
        const currentLocation = currentLocationCtx?.value as { latitude: number; longitude: number; address: string } | undefined;
        
        const arrivalTime = intent.data?.arrival_time;
        if (!arrivalTime) {
          result = '❓ К какому времени тебе нужно приехать?';
          break;
        }
        
        // Резолвим адрес назначения
        let rawTo = intent.data?.to;
        if (rawTo === 'home') rawTo = profile?.home_address;
        if (rawTo === 'work') rawTo = profile?.work_address;
        
        if (!rawTo) {
          result = '❓ Куда тебе нужно приехать?';
          break;
        }
        
        // Определяем откуда
        let fromGeo: { lat: number; lon: number } | null = null;
        let fromAddress = 'Текущая позиция';
        
        if (currentLocation) {
          fromGeo = { lat: currentLocation.latitude, lon: currentLocation.longitude };
          fromAddress = currentLocation.address || 'Твоя позиция';
        } else if (profile?.home_address) {
          const { data: geo } = await geocodeAddress(profile.home_address);
          fromGeo = geo;
          fromAddress = profile.home_address;
        }
        
        if (!fromGeo) {
          result = '❓ Не знаю откуда ты едешь. Расшарь геопозицию или скажи где ты сейчас.';
          break;
        }
        
        const { data: toGeo } = await geocodeAddress(rawTo);
        if (!toGeo) {
          result = `Не смог найти адрес: ${rawTo}`;
          break;
        }
        
        const { data: route, error } = await calculateRoute(
          fromGeo.lat, fromGeo.lon,
          toGeo.lat, toGeo.lon
        );
        
        if (error || !route) {
          result = `Ошибка расчёта маршрута: ${error}`;
          break;
        }
        
        const durationMin = Math.ceil(route.duration_in_traffic / 60);
        const departureTime = calculateDepartureTime(arrivalTime, durationMin);
        const distanceKm = (route.distance / 1000).toFixed(1);
        
        result = `🚗 **Расчёт времени выезда**

📍 Откуда: ${fromAddress}
🏁 Куда: ${rawTo}
📏 Расстояние: ${distanceKm} км
⏱️ Время в пути: ~${durationMin} мин

⏰ **Выезжай в ${departureTime}**, чтобы быть на месте к ${arrivalTime}

💡 _Учтены текущие пробки. Лучше выехать на 5-10 мин раньше на всякий случай._`;

        break;
      }

      // ========== НАПОМИНАНИЯ ==========
      case 'set_reminder': {
        let message = intent.data?.message;
        
        // Если запрошено напоминание о последних созданных задачах
        if (intent.data?.about_last_tasks || intent.data?.last_tasks_count) {
          const { data: contextList } = await getContext(userId);
          const lastTasksCtx = contextList?.find(c => c.key === 'last_created_tasks');
          const lastTasks = lastTasksCtx?.value as Array<{ id: string; title: string }> | undefined;
          
          if (!lastTasks || lastTasks.length === 0) {
            result = '❓ Не могу найти недавно созданные задачи. Сначала создай задачи.';
            break;
          }
          
          // Если указано количество - берём последние N
          const count = intent.data?.last_tasks_count || lastTasks.length;
          const tasksToRemind = lastTasks.slice(0, count);
          
          message = `Напоминание о задачах:\n${tasksToRemind.map((t, i) => `${i+1}. ${t.title}`).join('\n')}`;
        }
        
        if (!message) {
          result = '❓ О чём тебе напомнить?';
          break;
        }
        
        // Вычисляем время напоминания
        let remindAt: Date;
        const now = new Date();
        
        if (intent.data?.minutes) {
          // "через 15 минут"
          remindAt = new Date(now.getTime() + intent.data.minutes * 60 * 1000);
        } else if (intent.data?.time) {
          // "в 18:00" или "10:30"
          const [hours, minutes] = intent.data.time.split(':').map(Number);
          remindAt = new Date(now);
          remindAt.setHours(hours, minutes, 0, 0);
          
          // Если указана дата "tomorrow" - ставим на завтра
          if (intent.data?.date === 'tomorrow') {
            remindAt.setDate(now.getDate() + 1);
            remindAt.setHours(hours, minutes, 0, 0);
          } else if (remindAt <= now) {
            // Если время уже прошло сегодня — ставим на завтра
            remindAt.setDate(remindAt.getDate() + 1);
          }
        } else {
          result = '❓ Когда напомнить? Укажи время (в 18:00) или интервал (через 15 минут).';
          break;
        }
        
        // Получаем telegram_chat_id из контекста
        const { data: contextList } = await getContext(userId);
        const chatIdCtx = contextList?.find(c => c.key === 'telegram_chat_id');
        const telegramChatId = chatIdCtx?.value;
        
        if (!telegramChatId) {
          result = '⚠️ Не могу установить напоминание — не знаю твой Telegram chat ID.';
          break;
        }
        
        // Сохраняем в БД
        const { error } = await supabase
          .from('user_reminders')
          .insert({
            user_id: userId,
            telegram_chat_id: telegramChatId,
            message: message,
            remind_at: remindAt.toISOString(),
            sent: false
          });
        
        if (error) {
          consoleLog('error', 'Failed to save reminder', { error: error.message });
          result = '❌ Не удалось сохранить напоминание. Попробуй ещё раз.';
          break;
        }
        
        // Форматируем время для ответа
        const timeStr = remindAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const dateStr = remindAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        const isToday = remindAt.toDateString() === now.toDateString();
        
        result = `⏰ **Напоминание установлено!**

📝 ${message}
🕐 ${isToday ? 'Сегодня' : dateStr} в ${timeStr}

Я напомню тебе в Telegram! 🔔`;

        break;
      }

      // ========== ПРОБКИ ==========
      case 'get_traffic': {
        const { data: profile } = await getUserProfile(userId);
        
        if (!profile?.home_coordinates && !profile?.work_coordinates) {
          result = '❓ Укажи свой адрес, чтобы я мог проверить пробки в твоём районе.';
          break;
        }

        const coords = profile.home_coordinates || profile.work_coordinates!;
        const { data: traffic, error } = await getTrafficLevel(coords.lat, coords.lon);

        if (error || !traffic) {
          result = `Ошибка получения данных о пробках: ${error}`;
          break;
        }

        const emoji = traffic.level <= 2 ? '🟢' : traffic.level <= 5 ? '🟡' : '🔴';
        result = `${emoji} **Пробки:** ${traffic.description} (${traffic.level}/10)`;

        break;
      }

      // ========== СЕМЬЯ ==========
      case 'get_family': {
        const { data: family } = await getFamilyMembers(userId);
        result = formatFamilyForAI(family);

        // Проверяем ближайший ДР
        const nextBday = getNextBirthday(family);
        if (nextBday && nextBday.daysUntil <= 30) {
          result += `\n\n⏰ **Скоро:** ДР у ${nextBday.member.name} через ${nextBday.daysUntil} дн.`;
          
          if (nextBday.daysUntil <= 7) {
            result += '\n💡 Хочешь идей для подарка?';
          }
        }

        break;
      }

      // ========== СОБЫТИЯ ==========
      case 'get_events': {
        const { data: events } = await getUpcomingEvents(userId, 30);
        result = formatEventsForAI(events);
        break;
      }

      // ========== ИДЕИ ПОДАРКОВ ==========
      case 'suggest_gift': {
        const familyMemberName = intent.data?.for_who;
        
        if (!familyMemberName) {
          result = '❓ Для кого нужен подарок?';
          break;
        }

        const { data: family } = await getFamilyMembers(userId);
        const member = family.find(m => 
          m.name.toLowerCase().includes(familyMemberName.toLowerCase())
        );

        if (!member) {
          result = `Я не нашёл "${familyMemberName}" в твоей семье. Добавить?`;
          break;
        }

        // Анализируем интересы и историю подарков
        const interests = member.interests || [];
        const giftHistory = member.gift_history || [];

        result = `🎁 **Идеи подарков для ${member.name}:**\n\n`;

        if (interests.length > 0) {
          result += `💡 На основе интересов (${interests.join(', ')}):\n`;
          // Здесь можно добавить AI генерацию идей на основе интересов
          result += `- Что-то связанное с любимым хобби\n`;
          result += `- Книга или курс по теме интересов\n`;
          result += `- Впечатления/мероприятия\n\n`;
        }

        if (giftHistory.length > 0) {
          result += `📝 Прошлые подарки:\n`;
          giftHistory.slice(-3).forEach(g => {
            const liked = g.liked ? '👍' : '👎';
            result += `${liked} ${g.gift} (${new Date(g.date).toLocaleDateString('ru-RU')})\n`;
          });
        } else {
          result += `📝 История подарков пуста - буду запоминать что подаришь!\n`;
        }

        break;
      }

      // ========== ДОБАВИТЬ ЧЛЕНА СЕМЬИ ==========
      case 'add_family_member': {
        const { addFamilyMember } = await import('./personal-data-tools');
        
        const name = intent.data?.name;
        const relation = intent.data?.relation;

        if (!name || !relation) {
          result = '❓ Скажи имя и кто это (жена, сын, мама и т.д.)';
          break;
        }

        const { data: member, error } = await addFamilyMember(userId, {
          name,
          relation,
          birthday: intent.data?.birthday || null,
          interests: intent.data?.interests || [],
          gift_history: [],
          important_dates: [],
          notes: intent.data?.notes || null
        });

        if (error) {
          result = `Ошибка: ${error}`;
          break;
        }

        result = `✅ Добавил ${name} (${relation}) в семью!\n`;
        
        if (!intent.data?.birthday) {
          result += `\n💡 Кстати, когда день рождения? Буду напоминать заранее.`;
        }

        break;
      }

      // ========== ДОБАВИТЬ СОБЫТИЕ ==========
      case 'add_event': {
        const { addEvent } = await import('./personal-data-tools');

        const title = intent.data?.title;
        const date = intent.data?.date;

        if (!title || !date) {
          result = '❓ Укажи название события и дату';
          break;
        }

        const { data: event, error } = await addEvent(userId, {
          title,
          event_date: date,
          event_type: intent.data?.type || 'custom',
          event_time: intent.data?.time || null,
          location: intent.data?.location || null,
          reminder_settings: [
            { days_before: 7, sent: false },
            { days_before: 1, sent: false }
          ],
          notes: intent.data?.notes || null
        });

        if (error) {
          result = `Ошибка: ${error}`;
          break;
        }

        result = `✅ Добавил событие "${title}" на ${new Date(date).toLocaleDateString('ru-RU')}\n`;
        result += `⏰ Напомню за неделю и за день.`;

        break;
      }

      // ========== СОХРАНИТЬ ПРЕДПОЧТЕНИЕ/ФАКТ ==========
      case 'save_preference': {
        const key = intent.data?.key;
        const value = intent.data?.value;

        if (!key) {
          result = 'Ошибка: не указан ключ для сохранения';
          break;
        }

        const { upsertUserProfile } = await import('./personal-data-tools');

        // Маппинг ключей на поля профиля
        const profileKeyMap: Record<string, string> = {
          'user_name': 'full_name',
          'name': 'full_name',
          'имя': 'full_name',
          'home_address': 'home_address',
          'домашний_адрес': 'home_address',
          'work_address': 'work_address',
          'рабочий_адрес': 'work_address',
          'birthday': 'birthday',
          'день_рождения': 'birthday',
          'car_plate': 'car_plate',
          'номер_машины': 'car_plate',
        };

        // Сохраняем в контекст
        const saveResult = await saveContext(userId, 'preference', key, value, { source: 'user_said' });
        
        if (!saveResult.success) {
          consoleLog('error', 'Failed to save context', { key, error: saveResult.error });
        }

        // Если ключ относится к профилю — сохраняем также в user_profiles
        const profileField = profileKeyMap[key.toLowerCase()];
        if (profileField && typeof value === 'string') {
          const profileResult = await upsertUserProfile(userId, {
            [profileField]: value
          } as any);
          
          if (profileResult.error) {
            consoleLog('error', 'Failed to save to profile', { profileField, error: profileResult.error });
          } else {
            consoleLog('info', 'Saved to user_profiles', { profileField, value });
          }
        }

        result = `✅ Запомнил: ${value}`;

        // Если это адрес - геокодируем и сохраняем координаты
        if (key.includes('address') && typeof value === 'string') {
          const { data: geo } = await geocodeAddress(value);
          if (geo) {
            await upsertUserProfile(userId, {
              [key]: value,
              [`${key.replace('_address', '_coordinates')}`]: { lat: geo.lat, lon: geo.lon }
            } as any);
          }
        }

        break;
      }

      // ========== CRM: ЗАДАЧИ ==========
      case 'get_tasks': {
        const filters = intent.filters || {};
        const { data: tasks } = await getUserTasks(userId, { limit: 20 });
        
        if (!tasks || tasks.length === 0) {
          result = '📋 У тебя нет активных задач';
        } else {
          // Применяем фильтры
          let filteredTasks = tasks;
          
          // Фильтр по статусу
          if (filters.status) {
            filteredTasks = filteredTasks.filter((t: any) => t.status === filters.status);
          }
          
          // Исключить выполненные
          if (filters.exclude_done) {
            filteredTasks = filteredTasks.filter((t: any) => t.status !== 'done');
          }
          
          if (filteredTasks.length === 0) {
            if (filters.status === 'in_progress') {
              result = '📋 Нет активных задач (в работе)';
            } else {
              result = '📋 Нет задач по твоему запросу';
            }
          } else {
            const statusLabel = filters.status === 'in_progress' ? ' (активные)' : 
                               filters.exclude_done ? ' (невыполненные)' : '';
            result = `📋 **Твои задачи${statusLabel}:**\n\n`;
            
            // Сохраняем задачи в контекст для update_task
            await saveContext(userId, 'recent_topic', 'last_tasks_list', 
              filteredTasks.slice(0, 10).map((t: any) => ({ id: t.id, title: t.title })),
              { ttlDays: 1 }
            );
            
            filteredTasks.slice(0, 10).forEach((t: any, i: number) => {
              const priority = t.priority === 1 ? '🔴' : t.priority === 2 ? '🟡' : '🟢';
              const status = t.status === 'in_progress' ? '▶️' : t.status === 'done' ? '✅' : '⏸️';
              result += `${i + 1}. ${status} ${priority} ${t.title}\n`;
            });
          }
        }
        break;
      }

      // ========== CRM: ПРОЕКТЫ ==========
      case 'get_projects': {
        const { data: projects } = await getUserProjects(userId, { limit: 20 });
        if (!projects || projects.length === 0) {
          result = '📁 Нет активных проектов';
        } else {
          result = `📁 **Твои проекты:**\n\n`;
          projects.slice(0, 10).forEach((p: any, i: number) => {
            const name = p.project_name || p.client_name || p.title || 'Без названия';
            const status = p.status === 'active' ? '🟢' : p.status === 'completed' ? '✅' : '⏸️';
            result += `${i + 1}. ${status} ${name}\n`;
            if (p.deadline) {
              const deadline = new Date(p.deadline);
              result += `   📅 Срок: ${deadline.toLocaleDateString('ru-RU')}\n`;
            }
          });
        }
        break;
      }

      // ========== CRM: СЧЕТА ==========
      case 'get_invoices': {
        const filters: any = {};
        
        // Применяем фильтры из intent
        if (intent.filters?.limit) filters.limit = intent.filters.limit;
        if (intent.filters?.search_items) filters.search_items = intent.filters.search_items;
        if (intent.filters?.supplier_name) filters.supplier_name = intent.filters.supplier_name;
        if (intent.filters?.category) filters.category = intent.filters.category;
        if (intent.filters?.paid_status !== undefined) filters.paid_status = intent.filters.paid_status;
        
        const { data: invoices } = await getUserInvoices(userId, filters);
        
        if (!invoices || invoices.length === 0) {
          if (filters.search_items) {
            result = `💰 Не нашёл счета с товаром "${filters.search_items}"`;
          } else if (filters.supplier_name) {
            result = `💰 Не нашёл счета от поставщика "${filters.supplier_name}"`;
          } else {
            result = '💰 Нет счетов';
          }
        } else {
          // Используем улучшенное форматирование
          result = formatInvoicesForAI(invoices);
          
          // Если искали товар - добавляем подсказку
          if (filters.search_items && invoices.length > 0) {
            const uniqueSuppliers = [...new Set(invoices.map(inv => inv.supplier_name || inv.suppliers?.name).filter(Boolean))];
            if (uniqueSuppliers.length > 0) {
              result += `\n\n🏢 Поставщики: ${uniqueSuppliers.join(', ')}`;
            }
          }
        }
        break;
      }

      // ========== CRM: ДЕТАЛИ ПРОЕКТА ==========
      case 'get_full_project': {
        const projectId = intent.data?.project_id;
        if (!projectId) {
          result = '❌ Не указан ID проекта';
          break;
        }
        const { data: project } = await getFullProjectInfo(userId, projectId);
        if (!project) {
          result = '❌ Проект не найден';
        } else {
          result = `🏗️ **${project.project.project_name || project.project.client_name}**\n\n`;
          result += `📊 Статус: ${project.project.status}\n`;
          if (project.project.total_cost) result += `💰 Бюджет: ${project.project.total_cost.toLocaleString('ru-RU')} ₽\n`;
          if (project.project.deadline) result += `📅 Срок: ${new Date(project.project.deadline).toLocaleDateString('ru-RU')}\n`;
          result += `\n📋 Задачи: ${project.tasks.length}\n`;
          result += `💰 Счета: ${project.invoices.length}`;
        }
        break;
      }

      // ========== CRM: ПОИСК ==========
      case 'search_data': {
        const query = intent.data?.query;
        if (!query) {
          result = '❌ Не указан запрос для поиска';
          break;
        }
        const { data: searchResults } = await searchAllData(userId, query);
        if (!searchResults) {
          result = `🔍 По запросу "${query}" ничего не найдено`;
        } else {
          const { projects, tasks, invoices } = searchResults;
          result = `🔍 **Результаты поиска "${query}":**\n\n`;
          
          if (projects.length > 0) {
            result += `📁 **Проекты (${projects.length}):**\n`;
            projects.slice(0, 3).forEach((p: any, i: number) => {
              result += `${i + 1}. ${p.project_name || p.client_name || 'Без названия'}\n`;
            });
            result += '\n';
          }
          
          if (tasks.length > 0) {
            result += `📋 **Задачи (${tasks.length}):**\n`;
            tasks.slice(0, 3).forEach((t: any, i: number) => {
              result += `${i + 1}. ${t.title}\n`;
            });
            result += '\n';
          }
          
          if (invoices.length > 0) {
            result += `💰 **Счета (${invoices.length}):**\n`;
            invoices.slice(0, 3).forEach((inv: any, i: number) => {
              result += `${i + 1}. ${inv.invoice_number} - ${inv.total_amount?.toLocaleString('ru-RU')} ₽\n`;
            });
          }
          
          if (projects.length === 0 && tasks.length === 0 && invoices.length === 0) {
            result = `🔍 По запросу "${query}" ничего не найдено`;
          }
        }
        break;
      }

      // ========== CRM: СОЗДАТЬ ЗАДАЧУ ==========
      case 'create_task': {
        const title = intent.data?.title;
        if (!title) {
          result = '❌ Не указано название задачи';
          break;
        }
        const taskData = {
          title,
          priority: intent.data?.priority || 2,
          status: 'todo' as const,
          description: intent.data?.description
        };
        const { data: task, error } = await createTask(userId, taskData);
        if (error || !task) {
          result = `❌ Ошибка создания задачи: ${error}`;
        } else {
          // Сохраняем последние созданные задачи в контекст для напоминаний
          await saveContext(userId, 'fact', 'last_created_tasks', [{
            id: task.id,
            title: task.title
          }], { ttlDays: 1 });
          result = `✅ Создал задачу: "${title}"`;
        }
        break;
      }

      // ========== CRM: СОЗДАТЬ НЕСКОЛЬКО ЗАДАЧ ==========
      case 'create_multiple_tasks': {
        const tasks = intent.data?.tasks;
        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
          result = '❌ Не указаны задачи для создания';
          break;
        }
        
        const createdTasks: { id: string; title: string }[] = [];
        const errors: string[] = [];
        
        for (const t of tasks) {
          if (!t.title) {
            errors.push('Пропущена задача без названия');
            continue;
          }
          const taskData = {
            title: t.title,
            priority: t.priority || 2,
            status: 'todo' as const,
            description: t.description
          };
          const { data: task, error } = await createTask(userId, taskData);
          if (error || !task) {
            errors.push(`"${t.title}": ${error}`);
          } else {
            createdTasks.push({ id: task.id, title: task.title });
          }
        }
        
        // Сохраняем созданные задачи в контекст для напоминаний
        if (createdTasks.length > 0) {
          await saveContext(userId, 'fact', 'last_created_tasks', createdTasks, { ttlDays: 1 });
        }
        
        if (createdTasks.length === 0) {
          result = `❌ Не удалось создать задачи:\n${errors.join('\n')}`;
        } else if (errors.length > 0) {
          result = `✅ Создал ${createdTasks.length} задач:\n${createdTasks.map((t, i) => `${i+1}. ${t.title}`).join('\n')}\n\n⚠️ Ошибки:\n${errors.join('\n')}`;
        } else {
          result = `✅ Создал ${createdTasks.length} задач:\n${createdTasks.map((t, i) => `${i+1}. ${t.title}`).join('\n')}`;
        }
        break;
      }

      // ========== CRM: ОБНОВИТЬ ЗАДАЧУ ==========
      case 'update_task': {
        const taskIndex = intent.data?.task_index;
        const newStatus = intent.data?.status;
        
        if (!taskIndex) {
          result = '❌ Укажи номер задачи, например: "задачу 3 отметь выполненной"';
          break;
        }
        
        // Получаем список задач из контекста
        const { data: contextList } = await getContext(userId);
        const lastTasksCtx = contextList?.find(c => c.key === 'last_tasks_list');
        const lastTasks = lastTasksCtx?.value as Array<{ id: string; title: string }> | undefined;
        
        if (!lastTasks || lastTasks.length === 0) {
          // Если нет в контексте - получаем заново
          const { data: tasks } = await getUserTasks(userId, { limit: 20 });
          if (!tasks || tasks.length < taskIndex) {
            result = '❌ Задача не найдена. Сначала запроси список задач.';
            break;
          }
          const task = tasks[taskIndex - 1];
          
          const statusMap: Record<string, string> = {
            'done': 'done',
            'completed': 'done',
            'выполнена': 'done',
            'готово': 'done',
            'in_progress': 'in_progress',
            'в работе': 'in_progress',
            'todo': 'todo',
            'новая': 'todo'
          };
          
          const mappedStatus = statusMap[newStatus?.toLowerCase()] || newStatus;
          
          const { error } = await updateTask(userId, task.id, { status: mappedStatus });
          if (error) {
            result = `❌ Ошибка: ${error}`;
          } else {
            const statusEmoji = mappedStatus === 'done' ? '✅' : mappedStatus === 'in_progress' ? '▶️' : '⏸️';
            result = `${statusEmoji} Задача "${task.title}" обновлена!`;
          }
        } else {
          // Используем задачи из контекста
          if (taskIndex > lastTasks.length) {
            result = `❌ Нет задачи с номером ${taskIndex}. Максимум: ${lastTasks.length}`;
            break;
          }
          
          const task = lastTasks[taskIndex - 1];
          
          const statusMap: Record<string, string> = {
            'done': 'done',
            'completed': 'done',
            'выполнена': 'done',
            'готово': 'done',
            'in_progress': 'in_progress',
            'в работе': 'in_progress',
            'todo': 'todo',
            'новая': 'todo'
          };
          
          const mappedStatus = statusMap[newStatus?.toLowerCase()] || newStatus;
          
          const { error } = await updateTask(userId, task.id, { status: mappedStatus });
          if (error) {
            result = `❌ Ошибка: ${error}`;
          } else {
            const statusEmoji = mappedStatus === 'done' ? '✅' : mappedStatus === 'in_progress' ? '▶️' : '⏸️';
            result = `${statusEmoji} Задача "${task.title}" обновлена!`;
          }
        }
        break;
      }

      // ========== ПРОАКТИВНЫЙ ВОПРОС ==========
      case 'ask_question': {
        const question = intent.data?.question || intent.proactive_question;
        const topic = intent.data?.topic;

        if (question) {
          // Сохраняем проактивное действие
          await createProactiveAction(userId, 'question', topic || 'general', question);
          result = `❓ ${question}`;
        } else {
          result = 'Не знаю что спросить 🤔';
        }

        break;
      }

      // ========== УТРЕННИЙ БРИФИНГ ==========
      case 'morning_brief': {
        const { data: profile } = await getUserProfile(userId);
        const { data: events } = await getUpcomingEvents(userId, 7);

        result = `☀️ **Доброе утро!**\n\n`;

        // Погода
        if (profile?.home_coordinates) {
          const { data: weather } = await getWeather(profile.home_coordinates.lat, profile.home_coordinates.lon);
          if (weather) {
            const emoji = weather.temp > 15 ? '☀️' : weather.temp > 0 ? '🌤️' : '❄️';
            result += `${emoji} **Погода:** ${weather.temp > 0 ? '+' : ''}${weather.temp}°C\n`;
            result += getClothingAdvice(weather) + '\n\n';
          }
        }

        // Пробки
        if (profile?.work_coordinates && profile?.home_coordinates) {
          const { data: traffic } = await getTrafficLevel(profile.home_coordinates.lat, profile.home_coordinates.lon);
          if (traffic) {
            const emoji = traffic.level <= 3 ? '🟢' : traffic.level <= 6 ? '🟡' : '🔴';
            result += `${emoji} **Пробки:** ${traffic.description}\n\n`;
          }
        }

        // События сегодня
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = events.filter(e => e.event_date === today);
        if (todayEvents.length > 0) {
          result += `📅 **Сегодня:**\n`;
          todayEvents.forEach(e => {
            result += `- ${e.title}`;
            if (e.event_time) result += ` в ${e.event_time}`;
            result += '\n';
          });
          result += '\n';
        }

        // События на неделе
        const weekEvents = events.filter(e => e.event_date !== today);
        if (weekEvents.length > 0) {
          result += `📋 **На этой неделе:**\n`;
          weekEvents.slice(0, 3).forEach(e => {
            const date = new Date(e.event_date);
            result += `- ${e.title} (${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})\n`;
          });
        }

        break;
      }

      default:
        result = 'Не понял что нужно сделать 🤔';
    }

    // Сохраняем память если есть
    if (intent.memory_to_save) {
      for (const [key, value] of Object.entries(intent.memory_to_save)) {
        await saveContext(userId, 'fact', key, value, { source: 'inferred' });
      }
    }

    await log.finish({ outputData: { result }, status: 'success' });
    return result;

  } catch (error: any) {
    consoleLog('error', 'Error executing action', { error: error.message });
    await log.finish({ status: 'error', errorMessage: error.message });
    return `Ошибка: ${error.message}`;
  }
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================

export async function runPersonalAssistant(
  userId: string,
  userMessage: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<{ data: string; intent: PersonalAssistantRequest; sessionId: string }> {
  const startTime = Date.now();
  const sessionId = `pa-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  consoleLog('info', '=== Personal Assistant Session Started ===', { 
    sessionId, 
    userMessage,
    historyLength: conversationHistory?.length || 0 
  });

  // Загружаем профиль и семью
  const { data: profile } = await getUserProfile(userId);
  const { data: family } = await getFamilyMembers(userId);

  // Анализируем намерение (передаём историю)
  const intent = await analyzePersonalIntent(userMessage, userId, sessionId, profile, family, conversationHistory);

  // Если намерение неизвестно
  if (intent.action === 'unknown') {
    return {
      data: 'Извини, не совсем понял. Можешь переформулировать?',
      intent,
      sessionId
    };
  }

  // Выполняем действие
  const result = await executePersonalAction(userId, intent, sessionId);

  // Добавляем проактивный вопрос если есть
  let finalResult = result;
  if (intent.proactive_question && !result.includes(intent.proactive_question)) {
    finalResult += `\n\n${intent.proactive_question}`;
  }

  const elapsed = Date.now() - startTime;
  consoleLog('success', `Personal Assistant completed in ${elapsed}ms`, {
    action: intent.action,
    resultLength: finalResult.length
  });

  return { data: finalResult, intent, sessionId };
}
