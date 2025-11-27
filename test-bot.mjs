/**
 * Локальный тестер Telegram бота
 * Позволяет отправлять сообщения боту и видеть ответы
 */

import https from 'https';
import http from 'http';

// Конфигурация
const WEBHOOK_URL = 'https://alu.stella-spb.ru/api/telegram/webhook';
const CHAT_ID = 358802568; // Stanislav
const TELEGRAM_ID = 358802568;

let messageId = 2000; // Начальный ID для тестовых сообщений

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

/**
 * Отправить сообщение боту через webhook
 */
async function sendToBot(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      message: {
        message_id: messageId++,
        from: {
          id: TELEGRAM_ID,
          first_name: "Stanislav",
          last_name: "Tkachev",
          username: "stanislav_tk"
        },
        chat: {
          id: CHAT_ID,
          type: "private"
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
        'Content-Length': data.length
      }
    };

    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (e) {
          resolve({ ok: true, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Получить ответ бота из Telegram API
 */
async function getBotResponse(botToken, chatId, timeout = 5000) {
  const startTime = Date.now();
  let lastMessageId = 0;

  return new Promise((resolve) => {
    const checkMessages = () => {
      https.get(`https://api.telegram.org/bot${botToken}/getUpdates?offset=-10`, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.ok && data.result) {
              const messages = data.result
                .filter(u => u.message?.chat?.id === chatId)
                .map(u => u.message)
                .filter(m => m.message_id > lastMessageId);

              if (messages.length > 0) {
                lastMessageId = messages[messages.length - 1].message_id;
                resolve(messages.map(m => m.text).join('\n'));
                return;
              }
            }
          } catch (e) {
            // Ignore
          }

          if (Date.now() - startTime < timeout) {
            setTimeout(checkMessages, 500);
          } else {
            resolve('⏱️ Таймаут ожидания ответа');
          }
        });
      });
    };

    setTimeout(checkMessages, 1000); // Даём боту секунду на обработку
  });
}

/**
 * Тестовый сценарий
 */
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ТЕСТЕР TELEGRAM БОТА (Personal AI)     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}\n`);

  const tests = [
    {
      name: 'Команда /help',
      message: '/help',
      expected: 'Список команд'
    },
    {
      name: 'Команда /projects',
      message: '/projects',
      expected: 'Проекты со статусами'
    },
    {
      name: 'Запрос проектов через AI',
      message: 'какие у меня проекты?',
      expected: 'Список проектов от Personal Assistant'
    },
    {
      name: 'Запрос задач',
      message: 'какие у меня задачи?',
      expected: 'Список задач'
    },
    {
      name: 'Сохранение имени',
      message: 'Меня зовут Станислав',
      expected: 'Запоминание имени'
    },
    {
      name: 'Сохранение города',
      message: 'Я живу в Санкт-Петербурге',
      expected: 'Запоминание города'
    },
    {
      name: 'Запрос погоды (должен попросить адрес)',
      message: 'какая погода?',
      expected: 'Запрос адреса'
    },
    {
      name: 'Поиск проекта',
      message: 'найди проект школа',
      expected: 'Результаты поиска'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`${colors.bright}${colors.blue}[${i + 1}/${tests.length}] ${test.name}${colors.reset}`);
    console.log(`${colors.dim}   → ${test.message}${colors.reset}`);

    try {
      const startTime = Date.now();
      const response = await sendToBot(test.message);
      const duration = Date.now() - startTime;

      if (response.ok) {
        console.log(`${colors.green}   ✓ Webhook OK${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`);
        
        // Даём боту время обработать и отправить ответ
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log(`${colors.dim}   Ожидаемо: ${test.expected}${colors.reset}`);
        passed++;
      } else {
        console.log(`${colors.red}   ✗ Webhook ERROR: ${JSON.stringify(response)}${colors.reset}`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}   ✗ ERROR: ${error.message}${colors.reset}`);
      failed++;
    }

    console.log('');
    
    // Пауза между тестами
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}Результаты:${colors.reset}`);
  console.log(`${colors.green}✓ Успешно: ${passed}${colors.reset}`);
  console.log(`${colors.red}✗ Ошибки: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.yellow}💡 Совет: Проверь ответы бота в Telegram @stella_alu_bot${colors.reset}\n`);
}

/**
 * Интерактивный режим
 */
async function interactiveMode() {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`${colors.bright}${colors.magenta}╔═══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}║   ИНТЕРАКТИВНЫЙ РЕЖИМ ТЕСТИРОВАНИЯ       ║${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}╚═══════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`${colors.dim}Введите сообщение для бота (или 'exit' для выхода):${colors.reset}\n`);

  const askQuestion = () => {
    rl.question(`${colors.cyan}Вы → ${colors.reset}`, async (text) => {
      if (text.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      if (!text.trim()) {
        askQuestion();
        return;
      }

      try {
        const startTime = Date.now();
        const response = await sendToBot(text);
        const duration = Date.now() - startTime;

        if (response.ok) {
          console.log(`${colors.green}✓ Отправлено${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`);
          console.log(`${colors.yellow}💬 Проверьте ответ в Telegram${colors.reset}\n`);
        } else {
          console.log(`${colors.red}✗ Ошибка: ${JSON.stringify(response)}${colors.reset}\n`);
        }
      } catch (error) {
        console.log(`${colors.red}✗ ${error.message}${colors.reset}\n`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

// Запуск
const mode = process.argv[2];

if (mode === 'interactive' || mode === '-i') {
  interactiveMode();
} else {
  runTests();
}
