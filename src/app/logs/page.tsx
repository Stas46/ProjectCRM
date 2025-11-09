'use client';

import { useEffect, useState } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  details?: any;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        setLogs(data.logs || []);
      } catch (error) {
        console.error('Ошибка загрузки логов:', error);
      }
    };

    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const clearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Ошибка очистки логов:', error);
    }
  };

  const copyLogs = () => {
    const text = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${
        log.details ? '\n' + JSON.stringify(log.details, null, 2) : ''
      }`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    alert('Логи скопированы в буфер обмена');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Логи системы</h1>
            <div className="flex gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Автообновление (3с)</span>
              </label>
              <button
                onClick={copyLogs}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                📋 Копировать все
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                🗑️ Очистить
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            Всего записей: {logs.length}
          </div>
        </div>

        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              Логов пока нет
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                  log.level === 'error'
                    ? 'border-red-500'
                    : log.level === 'warn'
                    ? 'border-yellow-500'
                    : 'border-blue-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {log.timestamp}
                  </div>
                  <div
                    className={`text-xs font-semibold uppercase ${
                      log.level === 'error'
                        ? 'text-red-600'
                        : log.level === 'warn'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {log.level}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 font-mono whitespace-pre-wrap">
                      {log.message}
                    </div>
                    {log.details && (
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
