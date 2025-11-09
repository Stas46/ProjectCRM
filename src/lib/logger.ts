// Утилита для логирования

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  details?: any;
}

// Логирование на сервере
export async function log(level: 'info' | 'error' | 'warn', message: string, details?: any) {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };

  // Консоль для разработки
  console.log(`[${level.toUpperCase()}] ${message}`, details || '');

  // Отправка в API логов (только на сервере)
  if (typeof window === 'undefined') {
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
      
      if (!response.ok) {
        console.error('Ошибка отправки лога в API');
      }
    } catch (error) {
      console.error('Ошибка отправки лога:', error);
    }
  }
}

export const logger = {
  info: (message: string, details?: any) => log('info', message, details),
  error: (message: string, details?: any) => log('error', message, details),
  warn: (message: string, details?: any) => log('warn', message, details)
};
