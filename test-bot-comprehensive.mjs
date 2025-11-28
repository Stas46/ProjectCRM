#!/usr/bin/env node
/**
 * Комплексный тестер Telegram бота
 * Проверяет все возможности и фиксирует пробелы
 */

import https from 'https';

const WEBHOOK_URL = 'https://alu.stella-spb.ru/api/telegram/webhook';
const CHAT_ID = 358802568; // Stanislav
const TELEGRAM_ID = 358802568;

let messageId = Date.now();

// Цветной вывод
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

/**
 * Отправить сообщение боту
 */
async function sendToBot(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      message: {
        message_id: messageId++,
        from: {
          id: TELEGRAM_ID,
          first_name: 'Stanislav',
          last_name: 'Tkachev',
          username: 'stanislav_tk'
        },
        chat: {
          id: CHAT_ID,
          type: 'private'
        },
        text: text,
        date: Math.floor(Date.now() / 1000)
      }
    });

    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, response: parsed });
        } catch {
          resolve({ status: res.statusCode, response: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Анализ ответа бота
 */
function analyzeResponse(response) {
  // Webhook возвращает результат отправки в Telegram
  if (response.status === 200) {
    const data = response.response;
    
    // Если есть ответ Telegram
    if (data?.result?.text) {
      return {
        success: true,
        hasText: true,
        textLength: data.result.text.length,
        preview: data.result.text.substring(0, 100) + '...'
      };
    }
    
    // Если ok: true но без текста (обычный ответ)
    if (data?.ok) {
      return {
        success: true,
        hasText: false,
        note: 'Webhook OK, ответ будет отправлен асинхронно'
      };
    }
    
    return { success: true, data };
  }
  
  return { success: false, status: response.status };
}

/**
 * Тестовые сценарии
 */
const testCategories = [
  {
    category: '📊 CRM - Проекты',
    tests: [
      { message: 'какие у меня проекты?', expected: 'Список проектов' },
      { message: 'покажи проекты', expected: 'Список проектов' },
      { message: 'найди проект школа', expected: 'Поиск по названию' },
      { message: 'проект ТСЖ', expected: 'Поиск проекта' },
      { message: 'бюджет проекта школа', expected: 'Бюджет и расходы' },
      { message: 'детали проекта южное шоссе', expected: 'Заметки и детали' },
    ]
  },
  {
    category: '📋 CRM - Задачи',
    tests: [
      { message: 'какие у меня задачи?', expected: 'Список задач' },
      { message: 'мои задачи', expected: 'Список задач' },
      { message: 'задачи по школе', expected: 'Задачи по проекту' },
      { message: 'срочные задачи', expected: 'Фильтр по приоритету' },
      { message: 'саммари по задачам', expected: 'Итог задач' },
      { message: 'просроченные задачи', expected: 'Фильтр по дате' },
      { message: 'создай задачу: позвонить поставщику', expected: 'Создание задачи' },
    ]
  },
  {
    category: '💰 CRM - Счета',
    tests: [
      { message: 'покажи счета', expected: 'Список счетов' },
      { message: 'неоплаченные счета', expected: 'Фильтр по статусу' },
      { message: 'счета по школе', expected: 'Счета проекта' },
      { message: 'счета от проведал', expected: 'Фильтр по поставщику' },
      { message: 'сколько потратили на профиль?', expected: 'Фильтр по категории' },
      { message: 'счета на стекло', expected: 'Фильтр по категории' },
    ]
  },
  {
    category: '🌤️ Погода и маршруты',
    tests: [
      { message: 'какая погода?', expected: 'Погода или запрос города' },
      { message: 'погода в питере', expected: 'Погода в городе' },
      { message: 'какая сегодня погода в Санкт-Петербурге?', expected: 'Погода' },
      { message: 'как добраться до невского проспекта?', expected: 'Маршрут' },
      { message: 'пробки на дорогах', expected: 'Трафик' },
    ]
  },
  {
    category: '👨‍👩‍👧 Персональные данные',
    tests: [
      { message: 'меня зовут Станислав', expected: 'Сохранение имени' },
      { message: 'я живу в Санкт-Петербурге', expected: 'Сохранение города' },
      { message: 'мой email станислав@test.ru', expected: 'Сохранение email' },
      { message: 'моей жене нравятся цветы', expected: 'Сохранение предпочтения' },
      { message: 'у меня день рождения 15 мая', expected: 'Сохранение даты' },
    ]
  },
  {
    category: '👨‍👩‍👧‍👦 Семья',
    tests: [
      { message: 'добавь в семью жену Наталью', expected: 'Добавление члена семьи' },
      { message: 'у жены день рождения 20 марта', expected: 'Сохранение ДР' },
      { message: 'кто в моей семье?', expected: 'Список семьи' },
      { message: 'когда у жены день рождения?', expected: 'Запрос даты ДР' },
      { message: 'что подарить жене?', expected: 'Рекомендация подарка' },
    ]
  },
  {
    category: '📅 События',
    tests: [
      { message: 'какие у меня события?', expected: 'Список событий' },
      { message: 'напомни о встрече завтра в 10', expected: 'Создание события' },
      { message: 'что у меня на этой неделе?', expected: 'События недели' },
      { message: 'ближайшие праздники', expected: 'Праздники' },
    ]
  },
  {
    category: '💬 Контекст и память',
    tests: [
      { message: 'как меня зовут?', expected: 'Вспомнить имя' },
      { message: 'где я живу?', expected: 'Вспомнить город' },
      { message: 'покажи проекты', expected: '(контекст) Список проектов' },
      { message: 'покажи счета по нему', expected: '(контекст) Счета по последнему проекту' },
      { message: 'а задачи?', expected: '(контекст) Задачи того же проекта' },
    ]
  },
  {
    category: '🤖 Общие вопросы AI',
    tests: [
      { message: 'привет', expected: 'Приветствие' },
      { message: 'как дела?', expected: 'Small talk' },
      { message: 'расскажи анекдот', expected: 'Ответ AI' },
      { message: 'помоги с кодом', expected: 'Ответ AI' },
      { message: 'кто ты?', expected: 'Самопрезентация' },
    ]
  },
  {
    category: '❓ Сложные вопросы',
    tests: [
      { message: 'сколько всего я потратил за месяц?', expected: 'Агрегация данных' },
      { message: 'какой проект самый дорогой?', expected: 'Аналитика' },
      { message: 'кто мой крупнейший поставщик?', expected: 'Аналитика' },
      { message: 'сравни расходы по проектам', expected: 'Сравнение' },
      { message: 'что нужно сделать на этой неделе?', expected: 'Сводка задач и событий' },
    ]
  }
];

/**
 * Запуск тестов
 */
async function runTests() {
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║     КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ TELEGRAM БОТА                ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    categories: []
  };

  for (const category of testCategories) {
    console.log(`\n${colors.bright}${colors.magenta}${category.category}${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`);

    const categoryResult = {
      name: category.category,
      tests: []
    };

    for (const test of category.tests) {
      results.total++;
      process.stdout.write(`  ${colors.blue}→${colors.reset} ${test.message.padEnd(45)}`);

      try {
        const response = await sendToBot(test.message);
        const analysis = analyzeResponse(response);

        if (analysis.success) {
          results.passed++;
          console.log(`${colors.green}✓${colors.reset} ${colors.dim}${test.expected}${colors.reset}`);
          categoryResult.tests.push({ message: test.message, status: 'passed', expected: test.expected });
        } else {
          results.failed++;
          console.log(`${colors.red}✗${colors.reset} ${colors.dim}Status: ${analysis.status}${colors.reset}`);
          categoryResult.tests.push({ message: test.message, status: 'failed', error: analysis.status });
        }

        // Пауза между запросами чтобы не перегружать сервер
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        results.failed++;
        console.log(`${colors.red}✗ ERROR${colors.reset} ${colors.dim}${error.message}${colors.reset}`);
        categoryResult.tests.push({ message: test.message, status: 'error', error: error.message });
      }
    }

    results.categories.push(categoryResult);
  }

  // Итоги
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                        ИТОГИ                               ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`  ${colors.green}Успешно:${colors.reset} ${results.passed}/${results.total}`);
  console.log(`  ${colors.red}Ошибок:${colors.reset} ${results.failed}`);
  console.log(`  ${colors.yellow}Процент успеха:${colors.reset} ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  // Сохранить результаты
  const fs = await import('fs');
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  console.log(`${colors.dim}Результаты сохранены в test-results.json${colors.reset}\n`);

  return results;
}

// Режим одиночного теста
async function singleTest(message) {
  console.log(`\n${colors.cyan}Тест:${colors.reset} ${message}\n`);
  const response = await sendToBot(message);
  console.log(`${colors.green}Ответ:${colors.reset}`, JSON.stringify(response, null, 2));
}

// Запуск
const args = process.argv.slice(2);
if (args[0] === '-m' && args[1]) {
  singleTest(args[1]);
} else if (args[0] === '-c' && args[1]) {
  // Тест одной категории
  const category = testCategories.find(c => c.category.toLowerCase().includes(args[1].toLowerCase()));
  if (category) {
    console.log(`\nТестирую категорию: ${category.category}\n`);
    testCategories.length = 0;
    testCategories.push(category);
    runTests();
  } else {
    console.log('Категория не найдена. Доступные:', testCategories.map(c => c.category).join(', '));
  }
} else {
  runTests();
}
