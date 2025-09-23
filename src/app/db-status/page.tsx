'use client';

import { useState, useEffect } from 'react';
import { supabase, checkConnection } from '@/lib/supabase';

interface TableInfo {
  name: string;
  rowCount: number;
  exists: boolean;
  error?: any;
}

export default function DatabaseStatusPage() {
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean | null;
    error?: any;
    supabaseUrl?: string;
    supabaseKeyExists?: boolean;
  }>({
    isConnected: null
  });
  const [tablesInfo, setTablesInfo] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const expectedTables = [
    'projects',
    'tasks',
    'employees',
    'crews',
    'crew_members',
    'shifts',
    'shift_assignees',
    'invoices',
    'task_comments',
    'task_attachments'
  ];

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        setLoading(true);
        
        // Проверка конфигурации
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        // Проверка подключения
        const connectionResult = await checkConnection();
        
        setConnectionStatus({
          isConnected: connectionResult.success,
          error: connectionResult.error,
          supabaseUrl,
          supabaseKeyExists: !!supabaseKey
        });
        
        if (!connectionResult.success) {
          setLoading(false);
          return;
        }
        
        // Проверка таблиц
        const tablesStatus = await Promise.all(
          expectedTables.map(async (tableName) => {
            try {
              console.log(`Проверка таблицы ${tableName}...`);
              const { count, error } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });
                
              if (error) {
                console.error(`Ошибка при проверке таблицы ${tableName}:`, error);
                return {
                  name: tableName,
                  exists: false,
                  rowCount: 0,
                  error
                };
              }
              
              console.log(`Таблица ${tableName} существует, примерное количество строк: ${count}`);
              return {
                name: tableName,
                exists: true,
                rowCount: count || 0
              };
            } catch (err) {
              console.error(`Исключение при проверке таблицы ${tableName}:`, err);
              return {
                name: tableName,
                exists: false,
                rowCount: 0,
                error: err
              };
            }
          })
        );
        
        setTablesInfo(tablesStatus);
        setError(null);
      } catch (err: any) {
        console.error('Ошибка при проверке базы данных:', err);
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: false,
          error: err
        }));
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkDatabase();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Статус базы данных</h1>
      
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <div className="text-lg font-medium mb-2">Конфигурация:</div>
            <div className="p-4 bg-gray-50 border rounded-md mb-4">
              <div className="mb-2">
                <strong>Supabase URL:</strong> {connectionStatus.supabaseUrl || 'Не задан'}
              </div>
              <div>
                <strong>Supabase Key:</strong> {connectionStatus.supabaseKeyExists ? 'Задан' : 'Не задан'}
              </div>
            </div>
            
            <div className="text-lg font-medium mb-2">Подключение к базе данных:</div>
            <div className={`p-3 rounded-md mb-4 ${connectionStatus.isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
              {connectionStatus.isConnected 
                ? '✅ Успешное подключение к базе данных' 
                : '❌ Ошибка подключения к базе данных'}
              
              {connectionStatus.error && (
                <div className="mt-2">
                  <div className="font-medium">Детали ошибки:</div>
                  <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-60 text-sm">
                    {JSON.stringify(connectionStatus.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          {connectionStatus.isConnected && (
            <div>
              <div className="text-lg font-medium mb-2">Статус таблиц:</div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Таблица</th>
                      <th className="px-4 py-2 text-left">Статус</th>
                      <th className="px-4 py-2 text-left">Кол-во строк</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablesInfo.map((table) => (
                      <tr key={table.name} className="border-t">
                        <td className="px-4 py-2 font-medium">{table.name}</td>
                        <td className="px-4 py-2">
                          {table.exists 
                            ? <span className="text-green-600">✓ Существует</span> 
                            : <span className="text-red-600">✗ Не существует</span>}
                        </td>
                        <td className="px-4 py-2">{table.exists ? table.rowCount : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6">
                <h2 className="text-lg font-medium mb-2">Решение проблем:</h2>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Если таблицы не существуют, запустите SQL-скрипт <code className="bg-gray-100 px-1 rounded">supabase-reset-schema.sql</code> в консоли Supabase.</li>
                    <li>Если таблицы существуют, но в них нет данных, перейдите на страницу <a href="/seed" className="text-blue-600 underline">заполнения базы тестовыми данными</a>.</li>
                    <li>Проверьте правильность переменных окружения в файле <code className="bg-gray-100 px-1 rounded">.env.local</code>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
              {isConnected ? (
                <div className="flex items-center text-green-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Подключение успешно установлено
                </div>
              ) : (
                <div className="flex items-center text-red-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  Ошибка подключения к базе данных
                </div>
              )}
              
              {error && <div className="mt-2 text-red-600">{error}</div>}
            </div>
          </div>
          
          <div>
            <div className="text-lg font-medium mb-2">Состояние таблиц:</div>
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Таблица
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Количество записей
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tablesInfo.map((table) => (
                    <tr key={table.name}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {table.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {table.exists ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Существует
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Не найдена
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.exists ? table.rowCount : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p className="mb-2">Что делать, если таблицы не созданы или в них нет данных:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Перейдите на страницу <a href="/seed" className="text-blue-600 hover:underline">/seed</a> и заполните базу тестовыми данными</li>
              <li>Проверьте параметры подключения в файле .env.local</li>
              <li>Убедитесь, что SQL-схема была успешно применена в Supabase</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}