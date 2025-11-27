/**
 * Быстрый тестер с проверкой логов сервера
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
};

/**
 * Отправить сообщение через PowerShell
 */
async function sendMessage(text) {
  const body = JSON.stringify({
    message: {
      message_id: Date.now(),
      from: {
        id: 358802568,
        first_name: "Stanislav",
        username: "stanislav_tk"
      },
      chat: {
        id: 358802568,
        type: "private"
      },
      text: text,
      date: Math.floor(Date.now() / 1000)
    }
  });

  const command = `Invoke-WebRequest -Uri "https://alu.stella-spb.ru/api/telegram/webhook" -Method POST -ContentType "application/json" -Body '${body.replace(/'/g, "''")}'`;

  try {
    const { stdout } = await execAsync(command, { shell: 'powershell.exe' });
    return stdout.includes('200') || stdout.includes('StatusCode');
  } catch (error) {
    console.error(`${colors.red}Ошибка отправки: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Получить последние логи сервера
 */
async function getServerLogs(lines = 50) {
  try {
    const { stdout } = await execAsync(`ssh root@82.97.253.12 "pm2 logs crm-glazing --lines ${lines} --nostream"`, {
      shell: 'powershell.exe'
    });
    return stdout;
  } catch (error) {
    return `Ошибка получения логов: ${error.message}`;
  }
}

/**
 * Извлечь ответ бота из логов
 */
function extractBotResponse(logs) {
  const lines = logs.split('\n');
  const responses = [];
  
  // Ищем строки с отправкой сообщений
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Sending Telegram message') || line.includes('📤')) {
      // Берём следующие несколько строк
      const message = lines.slice(i, i + 5).join('\n');
      responses.push(message);
    }
  }

  return responses.length > 0 ? responses[responses.length - 1] : 'Ответ не найден в логах';
}

/**
 * Тестовый сценарий
 */
async function runQuickTest() {
  console.log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   БЫСТРЫЙ ТЕСТ БОТА С ЛОГАМИ              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}\n`);

  const tests = [
    { name: '/help', message: '/help' },
    { name: '/projects', message: '/projects' },
    { name: 'Проекты через AI', message: 'какие у меня проекты?' },
    { name: 'Задачи', message: 'какие задачи?' },
  ];

  for (const test of tests) {
    console.log(`${colors.blue}${colors.bright}▶ ${test.name}${colors.reset}`);
    console.log(`${colors.dim}  Отправляю: "${test.message}"${colors.reset}`);
    
    const sent = await sendMessage(test.message);
    
    if (sent) {
      console.log(`${colors.green}  ✓ Отправлено${colors.reset}`);
      
      // Ждём обработки
      await new Promise(r => setTimeout(r, 8000));
      
      // Проверяем логи
      console.log(`${colors.dim}  Проверяю логи...${colors.reset}`);
      const logs = await getServerLogs(100);
      
      // Показываем релевантные части логов
      const relevantLines = logs.split('\n')
        .filter(line => 
          line.includes('Handling command') ||
          line.includes('Personal Assistant') ||
          line.includes('Sending Telegram') ||
          line.includes('✅') ||
          line.includes('❌') ||
          line.includes('Message sent')
        )
        .slice(-10);
      
      if (relevantLines.length > 0) {
        console.log(`${colors.yellow}  📋 Логи:${colors.reset}`);
        relevantLines.forEach(line => {
          console.log(`${colors.dim}     ${line.substring(0, 120)}${colors.reset}`);
        });
      }
    } else {
      console.log(`${colors.red}  ✗ Ошибка отправки${colors.reset}`);
    }
    
    console.log('');
  }

  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}💡 Проверьте Telegram @stella_alu_bot для полных ответов${colors.reset}\n`);
}

runQuickTest();
