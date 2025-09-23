'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConnectionDiagnosticPage() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    status: 'loading' | 'success' | 'error';
    url?: string;
    hasKey?: boolean;
    connectionError?: any;
    pingResult?: any;
    isAccessible?: boolean;
  }>({
    status: 'loading'
  });

  useEffect(() => {
    async function runDiagnostics() {
      try {
        // Проверка наличия переменных окружения
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        // Начальная информация
        const info: {
          status: 'loading' | 'success' | 'error';
          url: string;
          hasKey: boolean;
          isAccessible: boolean;
          connectionError?: any;
          pingResult?: string;
        } = {
          status: 'loading',
          url: url || 'не определен',
          hasKey: !!key,
          isAccessible: false
        };
        
        // Проверка пинга до сервера
        try {
          const pingStart = Date.now();
          
          // Тестовый запрос
          const { error } = await supabase.from('projects').select('count', { count: 'exact', head: true });
          
          const pingEnd = Date.now();
          
          if (error) {
            // Ошибка подключения
            info.status = 'error';
            info.connectionError = error;
            info.pingResult = `Ошибка при запросе: ${error.message}`;
          } else {
            // Успешное подключение
            info.status = 'success';
            info.isAccessible = true;
            info.pingResult = `Успешно, время: ${pingEnd - pingStart}ms`;
          }
        } catch (err: any) {
          // Исключение при запросе
          info.status = 'error';
          info.connectionError = err;
          info.pingResult = `Исключение: ${err.message}`;
        }
        
        setDiagnosticInfo(info);
      } catch (err: any) {
        setDiagnosticInfo({
          status: 'error',
          connectionError: err
        });
      }
    }
    
    runDiagnostics();
  }, []);

  const handleTestRequest = async () => {
    try {
      setDiagnosticInfo(prev => ({ ...prev, status: 'loading' }));
      
      // Тестируем запрос на наличие таблиц
      console.log('Выполняем тестовый запрос...');
      const { data, error } = await supabase.rpc('get_schema_info');
      
      if (error) {
        console.error('Ошибка при выполнении тестового запроса:', error);
        setDiagnosticInfo(prev => ({
          ...prev,
          status: 'error',
          connectionError: error,
          pingResult: `Ошибка при запросе: ${error.message}`
        }));
      } else {
        console.log('Тестовый запрос выполнен успешно:', data);
        setDiagnosticInfo(prev => ({
          ...prev,
          status: 'success',
          isAccessible: true,
          pingResult: 'Тестовый запрос выполнен успешно'
        }));
      }
    } catch (err: any) {
      console.error('Исключение при выполнении тестового запроса:', err);
      setDiagnosticInfo(prev => ({
        ...prev,
        status: 'error',
        connectionError: err,
        pingResult: `Исключение: ${err.message}`
      }));
    }
  };

  // Проверка функции RPC
  const createRpcFunction = async () => {
    try {
      setDiagnosticInfo(prev => ({ ...prev, status: 'loading' }));
      
      const { error } = await supabase.rpc('create_schema_info_function');
      
      if (error) {
        setDiagnosticInfo(prev => ({
          ...prev,
          status: 'error',
          connectionError: error,
          pingResult: `Ошибка при создании функции: ${error.message}`
        }));
      } else {
        setDiagnosticInfo(prev => ({
          ...prev,
          status: 'success',
          pingResult: 'Функция RPC успешно создана'
        }));
      }
    } catch (err: any) {
      setDiagnosticInfo(prev => ({
        ...prev,
        status: 'error',
        connectionError: err,
        pingResult: `Исключение: ${err.message}`
      }));
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Диагностика подключения к Supabase</h1>
      
      {diagnosticInfo.status === 'loading' ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 border rounded-md">
            <h2 className="text-lg font-medium mb-2">Конфигурация</h2>
            <div className="space-y-2">
              <div>
                <strong>URL:</strong> {diagnosticInfo.url}
              </div>
              <div>
                <strong>Ключ API:</strong> {diagnosticInfo.hasKey ? 'Определен' : 'Не определен'}
              </div>
            </div>
          </div>
          
          <div className={`p-4 border rounded-md ${
            diagnosticInfo.status === 'success' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
          }`}>
            <h2 className="text-lg font-medium mb-2">Результат подключения</h2>
            <div className="space-y-2">
              <div>
                <strong>Статус:</strong> {
                  diagnosticInfo.status === 'success' ? 
                  'Успешно' : 
                  'Ошибка'
                }
              </div>
              <div>
                <strong>Доступность сервера:</strong> {
                  diagnosticInfo.isAccessible ? 
                  'Сервер доступен' : 
                  'Сервер недоступен'
                }
              </div>
              {diagnosticInfo.pingResult && (
                <div>
                  <strong>Результат проверки:</strong> {diagnosticInfo.pingResult}
                </div>
              )}
              {diagnosticInfo.connectionError && (
                <div className="mt-4">
                  <h3 className="font-medium text-red-700">Детали ошибки:</h3>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-60 text-sm">
                    {JSON.stringify(diagnosticInfo.connectionError, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={handleTestRequest}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md"
            >
              Выполнить тестовый запрос
            </button>
            
            <button
              onClick={createRpcFunction}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md"
            >
              Создать функцию диагностики
            </button>
          </div>
        </div>
      )}
    </div>
  );
}