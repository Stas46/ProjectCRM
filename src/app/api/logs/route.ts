import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs.json');

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  details?: any;
}

// Создать лог
export async function POST(request: NextRequest) {
  try {
    const logEntry: LogEntry = await request.json();
    
    // Добавить временную метку если нет
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date().toISOString();
    }

    // Прочитать существующие логи
    let logs: LogEntry[] = [];
    try {
      const content = await fs.readFile(LOG_FILE, 'utf-8');
      logs = JSON.parse(content);
    } catch {
      // Файл не существует - создадим новый
    }

    // Добавить новый лог
    logs.push(logEntry);

    // Ограничить до последних 100 записей
    if (logs.length > 100) {
      logs = logs.slice(-100);
    }

    // Сохранить
    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка сохранения лога:', error);
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
  }
}

// Получить логи
export async function GET() {
  try {
    const content = await fs.readFile(LOG_FILE, 'utf-8');
    const logs = JSON.parse(content);
    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ logs: [] });
  }
}

// Очистить логи
export async function DELETE() {
  try {
    await fs.writeFile(LOG_FILE, '[]');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка очистки логов:', error);
    return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 });
  }
}
