/**
 * Personal Assistant Agent
 * Расширенный AI агент с проактивными диалогами и личным контекстом
 */

import OpenAI from 'openai';
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

ДОСТУПНЫЕ ДЕЙСТВИЯ:

**Рабочие (CRM):**
- get_tasks - задачи
- get_projects - проекты
- get_invoices - счета
- get_budget - бюджет проекта
- get_full_project - вся информация о проекте
- search_data - поиск по CRM
- get_analytics - аналитика расходов
- create_task - создать задачу
- update_task - обновить задачу

**Личные:**
- get_weather - погода сейчас и прогноз
- get_route - маршрут и время в пути
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

ПРИМЕРЫ ПРОАКТИВНЫХ ДИАЛОГОВ:

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
    // CRM actions
    | 'get_tasks' | 'get_projects' | 'get_invoices' | 'get_budget' 
    | 'get_full_project' | 'search_data' | 'get_analytics'
    | 'create_task' | 'update_task'
    // Personal actions
    | 'get_weather' | 'get_route' | 'get_traffic'
    | 'get_family' | 'get_events' | 'suggest_gift'
    | 'add_family_member' | 'add_event'
    | 'save_preference'
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
  familyMembers?: FamilyMember[]
): Promise<PersonalAssistantRequest> {
  const log = startAgentLog(userId, 'personal_assistant', 'analyze_intent', { userMessage }, sessionId);

  try {
    consoleLog('info', 'Personal Assistant: Analyzing intent...', { userMessage });

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

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: PERSONAL_ASSISTANT_SYSTEM_PROMPT },
        { role: 'user', content: userMessage + contextMessage }
      ],
      temperature: 0.4,
      max_tokens: 800
    });

    const content = response.choices[0].message.content || '{}';
    consoleLog('info', 'AI Response', { content });

    // Парсим JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON');
    }

    const intent: PersonalAssistantRequest = JSON.parse(jsonMatch[0]);
    
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
      // ========== ПОГОДА ==========
      case 'get_weather': {
        const { data: profile } = await getUserProfile(userId);
        
        if (!profile?.home_coordinates) {
          result = '❓ Я не знаю где ты находишься. Скажи свой адрес или город, и я покажу погоду.';
          break;
        }

        const { lat, lon } = profile.home_coordinates;
        const { data: weather, error } = await getWeather(lat, lon);

        if (error || !weather) {
          result = `Ошибка получения погоды: ${error}`;
          break;
        }

        result = formatWeatherForAI(weather);
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
        const fromAddress = intent.data?.from || profile?.home_address;
        const toAddress = intent.data?.to;

        if (!fromAddress || !toAddress) {
          result = '❓ Укажи откуда и куда нужно ехать. Например: "Сколько ехать от дома до работы"';
          break;
        }

        // Геокодируем адреса
        const { data: fromGeo } = await geocodeAddress(fromAddress);
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

        await saveContext(userId, 'preference', key, value, { source: 'user_said' });
        result = `✅ Запомнил: ${key}`;

        // Если это адрес - геокодируем и сохраняем в профиль
        if (key.includes('address') && typeof value === 'string') {
          const { data: geo } = await geocodeAddress(value);
          if (geo) {
            const { upsertUserProfile } = await import('./personal-data-tools');
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
        const { data: tasks } = await getUserTasks(userId, { limit: 20 });
        if (!tasks || tasks.length === 0) {
          result = '📋 У тебя нет активных задач';
        } else {
          result = `📋 **Твои задачи:**\n\n`;
          tasks.slice(0, 10).forEach((t: any, i: number) => {
            const priority = t.priority === 1 ? '🔴' : t.priority === 2 ? '🟡' : '🟢';
            const status = t.status === 'in_progress' ? '▶️' : t.status === 'done' ? '✅' : '⏸️';
            result += `${i + 1}. ${status} ${priority} ${t.title}\n`;
          });
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
        const { data: invoices } = await getUserInvoices(userId, { limit: 20 });
        if (!invoices || invoices.length === 0) {
          result = '💰 Нет счетов';
        } else {
          result = `💰 **Счета:**\n\n`;
          invoices.slice(0, 10).forEach((inv: any, i: number) => {
            const status = inv.paid_status ? '✅' : '⏳';
            result += `${i + 1}. ${status} ${inv.invoice_number} - ${inv.total_amount?.toLocaleString('ru-RU')} ₽\n`;
            if (inv.supplier_name) result += `   🏪 ${inv.supplier_name}\n`;
          });
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
        const { data: project } = await getFullProjectInfo(projectId);
        if (!project) {
          result = '❌ Проект не найден';
        } else {
          result = `🏗️ **${project.project_name || project.client_name}**\n\n`;
          result += `📊 Статус: ${project.status}\n`;
          if (project.total_cost) result += `💰 Бюджет: ${project.total_cost.toLocaleString('ru-RU')} ₽\n`;
          if (project.deadline) result += `📅 Срок: ${new Date(project.deadline).toLocaleDateString('ru-RU')}\n`;
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
        const { data: projects } = await searchAllData(query);
        if (!projects || projects.length === 0) {
          result = `🔍 По запросу "${query}" ничего не найдено`;
        } else {
          result = `🔍 **Результаты поиска "${query}":**\n\n`;
          projects.slice(0, 5).forEach((p: any, i: number) => {
            result += `${i + 1}. ${p.project_name || p.client_name}\n`;
          });
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
          result = `✅ Создал задачу: "${title}"`;
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
  userMessage: string
): Promise<{ data: string; intent: PersonalAssistantRequest; sessionId: string }> {
  const startTime = Date.now();
  const sessionId = `pa-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  consoleLog('info', '=== Personal Assistant Session Started ===', { sessionId, userMessage });

  // Загружаем профиль и семью
  const { data: profile } = await getUserProfile(userId);
  const { data: family } = await getFamilyMembers(userId);

  // Анализируем намерение
  const intent = await analyzePersonalIntent(userMessage, userId, sessionId, profile, family);

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
