#!/usr/bin/env node
/**
 * Тестирование Personal Assistant локально
 * С полным логированием всех запросов и ответов
 */

import https from 'https';
import fs from 'fs';

const WEBHOOK_URL = 'https://alu.stella-spb.ru/api/telegram/webhook';
const TEST_USER_ID = 123456789;
const LOG_FILE = 'bot-test-log.json';

// Цветной вывод
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  request: (msg) => console.log(`${colors.blue}📤 ${msg}${colors.reset}`),
  response: (msg) => console.log(`${colors.green}📥 ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.yellow}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`)
};

// История всех тестов
let testHistory = [];

/**
 * Отправить сообщение боту через webhook
 */
async function sendToBotWebhook(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      message: {
        message_id: Date.now(),
        from: {
          id: TEST_USER_ID,
          first_name: 'Test',
          username: 'testuser'
        },
        chat: {
          id: TEST_USER_ID,
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

    log.request(`Sending to webhook: "${text}"`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Проверить логи на сервере (через SSH)
 */
async function checkServerLogs() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('ssh root@82.97.253.12 "pm2 logs crm-glazing --nostream --lines 50"', 
      (error, stdout, stderr) => {
        if (error) {
          log.error(`SSH error: ${error.message}`);
          resolve(null);
          return;
        }
        resolve(stdout);
      }
    );
  });
}

/**
 * Тестовый сценарий
 */
async function runTest(name, message, expectedKeywords = []) {
  console.log('\n' + '='.repeat(80));
  log.test(`${name}`);
  console.log('='.repeat(80));

  const testStart = Date.now();
  const testLog = {
    name,
    message,
    expectedKeywords,
    timestamp: new Date().toISOString(),
    duration: 0,
    webhookResponse: null,
    botReply: null,
    serverLogs: null,
    success: false
  };

  try {
    // 1. Отправляем сообщение
    const webhookResult = await sendToBotWebhook(message);
    testLog.webhookResponse = webhookResult;
    
    log.response(`Webhook status: ${webhookResult.status}`);
    if (webhookResult.data) {
      console.log(JSON.stringify(webhookResult.data, null, 2));
    }

    // 2. Ждём обработки
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Проверяем логи сервера
    log.info('Checking server logs...');
    const serverLogs = await checkServerLogs();
    testLog.serverLogs = serverLogs;

    if (serverLogs) {
      // Ищем ответ бота в логах
      const lines = serverLogs.split('\n');
      const botResponseLines = [];
      let foundResponse = false;

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        
        // Ищем отправку сообщения в Telegram
        if (line.includes('sendMessage') || line.includes('Sending to Telegram')) {
          foundResponse = true;
          botResponseLines.unshift(line);
        }
        
        // Ищем обработку сообщения
        if (line.includes(message)) {
          log.info(`Found message processing in logs`);
          break;
        }
      }

      if (botResponseLines.length > 0) {
        log.success('Bot response found in logs:');
        botResponseLines.forEach(l => console.log(`  ${l}`));
        testLog.botReply = botResponseLines.join('\n');
      } else {
        log.error('No bot response found in logs');
      }

      // Проверяем ключевые слова
      if (expectedKeywords.length > 0) {
        const logText = serverLogs.toLowerCase();
        const foundKeywords = expectedKeywords.filter(kw => 
          logText.includes(kw.toLowerCase())
        );

        if (foundKeywords.length === expectedKeywords.length) {
          log.success(`All keywords found: ${foundKeywords.join(', ')}`);
          testLog.success = true;
        } else {
          const missing = expectedKeywords.filter(kw => 
            !logText.includes(kw.toLowerCase())
          );
          log.error(`Missing keywords: ${missing.join(', ')}`);
        }
      } else {
        testLog.success = true;
      }
    }

    testLog.duration = Date.now() - testStart;

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    testLog.error = error.message;
  }

  testHistory.push(testLog);
  
  console.log(`\n${colors.yellow}Duration: ${testLog.duration}ms${colors.reset}`);
  if (testLog.success) {
    log.success('TEST PASSED');
  } else {
    log.error('TEST FAILED');
  }
}

/**
 * Сохранить результаты тестов
 */
function saveResults() {
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: testHistory.length,
    passed: testHistory.filter(t => t.success).length,
    failed: testHistory.filter(t => !t.success).length,
    tests: testHistory
  };

  fs.writeFileSync(LOG_FILE, JSON.stringify(report, null, 2));
  log.success(`Results saved to ${LOG_FILE}`);

  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`Total: ${report.totalTests}`);
  console.log(`${colors.green}Passed: ${report.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${report.failed}${colors.reset}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Основные тесты
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║        PERSONAL ASSISTANT BOT - COMPREHENSIVE TESTING SUITE          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Тест 1: Базовая команда
  await runTest(
    'Test 1: Help Command',
    '/help',
    ['help', 'команды', 'доступны']
  );

  // Тест 2: Проекты через команду
  await runTest(
    'Test 2: Projects Command',
    '/projects',
    ['проект']
  );

  // Тест 3: Погода через Personal Assistant
  await runTest(
    'Test 3: Weather via Personal Assistant',
    'какая сегодня погода?',
    ['погода', 'температура']
  );

  // Тест 4: Проекты через Personal Assistant
  await runTest(
    'Test 4: Projects via Personal Assistant',
    'какие у меня проекты?',
    ['проект']
  );

  // Тест 5: Задачи
  await runTest(
    'Test 5: Tasks via Personal Assistant',
    'какие у меня задачи?',
    ['задач']
  );

  // Тест 6: Неизвестный запрос
  await runTest(
    'Test 6: Unknown Request',
    'сколько звёзд на небе?',
    []
  );

  // Тест 7: Проактивный вопрос
  await runTest(
    'Test 7: Proactive Question',
    'у меня скоро день рождения жены',
    []
  );

  // Тест 8: Сохранение информации
  await runTest(
    'Test 8: Save Information',
    'я живу в Санкт-Петербурге',
    []
  );

  // Сохраняем результаты
  saveResults();
}

// Запуск
main().catch(err => {
  log.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
