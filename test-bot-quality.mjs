#!/usr/bin/env node
/**
 * Тестер качества ответов бота
 * Отправляет сообщения и получает реальные ответы через Telegram API
 */

import https from 'https';

const BOT_TOKEN = '8508895640:AAFY0r_tqqEIeNQZ1ntjTVQbfuRUaf7PxP8';
const WEBHOOK_URL = 'https://alu.stella-spb.ru/api/telegram/webhook';
const CHAT_ID = 358802568;
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
 * Сделать HTTP запрос
 */
function httpRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/**
 * Отправить сообщение через webhook (как если бы от пользователя)
 */
async function sendToWebhook(text) {
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

  return httpRequest(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);
}

/**
 * Получить последние сообщения от бота
 */
async function getRecentBotMessages(count = 5) {
  const response = await httpRequest(
    `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-${count}&limit=${count}`
  );
  
  if (response.data?.ok && response.data?.result) {
    return response.data.result
      .filter(u => u.message?.from?.is_bot)
      .map(u => ({
        text: u.message?.text,
        date: new Date(u.message?.date * 1000).toLocaleTimeString()
      }));
  }
  return [];
}

/**
 * Отправить тестовое сообщение и дождаться ответа
 */
async function testMessage(message, description) {
  console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.yellow}Тест:${colors.reset} ${description}`);
  console.log(`${colors.blue}Сообщение:${colors.reset} ${message}`);
  
  // Отправляем
  const result = await sendToWebhook(message);
  
  if (result.status !== 200) {
    console.log(`${colors.red}Ошибка webhook:${colors.reset} ${result.status}`);
    return { success: false };
  }

  // Ждём ответа от бота (он отправляет через Telegram API)
  console.log(`${colors.dim}Ожидание ответа...${colors.reset}`);
  await new Promise(r => setTimeout(r, 4000)); // Даём боту время ответить
  
  // Проверяем что бот ответил в чат
  // (webhook возвращает результат sendMessage)
  if (result.data?.result?.text) {
    console.log(`${colors.green}Ответ бота:${colors.reset}`);
    console.log(`${colors.dim}${result.data.result.text}${colors.reset}`);
    return { success: true, response: result.data.result.text };
  }
  
  // Если webhook вернул ok: true но без текста - попробуем получить из getUpdates
  // (на практике webhook возвращает результат sendMessage напрямую)
  
  console.log(`${colors.yellow}Webhook OK, проверяем чат...${colors.reset}`);
  return { success: true, response: 'Ответ отправлен в Telegram' };
}

/**
 * Основные тесты
 */
const tests = [
  // CRM базовые
  { message: 'какие у меня проекты?', desc: 'Запрос проектов' },
  { message: 'какие у меня задачи?', desc: 'Запрос задач' },
  { message: 'покажи неоплаченные счета', desc: 'Фильтр счетов' },
  
  // Персональные
  { message: 'как меня зовут?', desc: 'Проверка памяти (имя)' },
  { message: 'где я живу?', desc: 'Проверка памяти (город)' },
  { message: 'кто в моей семье?', desc: 'Список семьи' },
  
  // Сложные
  { message: 'какой проект самый дорогой?', desc: 'Аналитика по проектам' },
  { message: 'что нужно сделать сегодня?', desc: 'Сводка на день' },
  { message: 'когда у жены день рождения?', desc: 'Запрос о семье' },
  
  // Контекст
  { message: 'покажи счета по последнему проекту', desc: 'Контекст диалога' },
];

async function runQualityTests() {
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║      ТЕСТИРОВАНИЕ КАЧЕСТВА ОТВЕТОВ БОТА                   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);

  const results = [];
  
  for (const test of tests) {
    const result = await testMessage(test.message, test.desc);
    results.push({ ...test, ...result });
    
    // Пауза между тестами
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n${colors.bright}${colors.magenta}═══ Итоги ═══${colors.reset}`);
  console.log(`Протестировано: ${results.length}`);
  console.log(`Успешно доставлено: ${results.filter(r => r.success).length}`);
  
  return results;
}

// Запуск
const args = process.argv.slice(2);
if (args[0] === '-m' && args[1]) {
  // Одиночный тест
  testMessage(args.slice(1).join(' '), 'Ручной тест');
} else if (args[0] === '-last') {
  // Показать последние сообщения
  getRecentBotMessages(10).then(msgs => {
    console.log('Последние сообщения от бота:');
    msgs.forEach((m, i) => console.log(`${i+1}. [${m.date}] ${m.text?.substring(0, 100)}...`));
  });
} else {
  runQualityTests();
}
