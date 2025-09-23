'use client';

import { useState, useEffect } from 'react';
import { supabase, checkConnection } from '@/lib/supabase';

export default function AdvancedDiagnosticsPage() {
  const [diagnosticResults, setDiagnosticResults] = useState<{
    status: 'loading' | 'success' | 'error';
    connectionInfo?: {
      url?: string;
      keyExists?: boolean;
      connected: boolean;
      error?: any;
    };
    networkInfo?: {
      ping?: number;
      connectionTime?: number;
    };
    authInfo?: {
      isAuthenticated: boolean;
      role?: string;
      error?: any;
    };
    rpcAvailable?: boolean;
    serviceStatus?: {
      database: boolean;
      auth: boolean;
      storage: boolean;
      realtime: boolean;
    };
  }>({
    status: 'loading'
  });

  // Проверка подключения к серверу
  const testConnection = async () => {
    try {
      setDiagnosticResults(prev => ({ ...prev, status: 'loading' }));
      
      // Получаем конфигурацию
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      // Базовая информация
      const results = {
        status: 'loading' as const,
        connectionInfo: {
          url,
          keyExists: !!key,
          connected: false
        },
        networkInfo: {}
      };
      
      // Проверка подключения с замером времени
      console.log('Проверка подключения к Supabase...');
      const startTime = Date.now();
      
      const connectionResult = await checkConnection();
      
      const endTime = Date.now();
      
      results.connectionInfo.connected = connectionResult.success;
      results.connectionInfo.error = connectionResult.error;
      results.networkInfo = {
        connectionTime: endTime - startTime
      };
      
      // Проверка наличия RPC
      if (connectionResult.success) {
        try {
          const { data, error } = await supabase.rpc('get_schema_info');
          results.rpcAvailable = !error;
        } catch {
          results.rpcAvailable = false;
        }
        
        // Проверка аутентификации
        try {
          const { data: authData, error: authError } = await supabase.auth.getSession();
          
          results.authInfo = {
            isAuthenticated: !!authData?.session,
            role: authData?.session?.user?.role || 'anon',
            error: authError
          };
        } catch (err) {
          results.authInfo = {
            isAuthenticated: false,
            error: err
          };
        }
      }
      
      results.status = connectionResult.success ? 'success' : 'error';
      setDiagnosticResults(results);
      
    } catch (err) {
      setDiagnosticResults({
        status: 'error',
        connectionInfo: {
          connected: false,
          error: err
        }
      });
    }
  };

  // Создание диагностической функции
  const createDiagnosticFunction = async () => {
    try {
      setDiagnosticResults(prev => ({ ...prev, status: 'loading' }));
      
      // Запрос SQL для создания функции
      const sqlQuery = `
      CREATE OR REPLACE FUNCTION get_schema_info()
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
          result json;
      BEGIN
          -- Получаем информацию о всех таблицах в схеме public
          SELECT json_agg(table_info)
          INTO result
          FROM (
              SELECT 
                  t.table_name,
                  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
                  EXISTS (
                      SELECT 1 
                      FROM pg_indexes 
                      WHERE tablename = t.table_name AND schemaname = 'public'
                  ) as has_indexes,
                  EXISTS (
                      SELECT 1 
                      FROM pg_trigger 
                      WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = t.table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
                  ) as has_triggers,
                  (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as approx_row_count
              FROM information_schema.tables t
              WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
          ) table_info;

          RETURN result;
      END;
      $$;
      `;
      
      // Выполнение SQL для создания функции
      const { error } = await supabase.rpc('exec_sql', { sql: sqlQuery });
      
      if (error) {
        console.error('Ошибка при создании диагностической функции:', error);
        setDiagnosticResults(prev => ({
          ...prev,
          status: 'error',
          connectionInfo: {
            ...prev.connectionInfo,
            error
          }
        }));
      } else {
        console.log('Диагностическая функция успешно создана');
        testConnection();
      }
    } catch (err) {
      console.error('Исключение при создании диагностической функции:', err);
      setDiagnosticResults(prev => ({
        ...prev,
        status: 'error',
        connectionInfo: {
          ...prev.connectionInfo,
          error: err
        }
      }));
    }
  };

  // Загрузка при монтировании компонента
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Расширенная диагностика Supabase</h1>
      
      {diagnosticResults.status === 'loading' ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Информация о подключении */}
          <div className={`p-4 border rounded-md ${
            diagnosticResults.connectionInfo?.connected 
              ? 'bg-green-50 border-green-300' 
              : 'bg-red-50 border-red-300'
          }`}>
            <h2 className="text-lg font-medium mb-2">Статус подключения</h2>
            <div className="space-y-2">
              <div>
                <strong>URL:</strong> {diagnosticResults.connectionInfo?.url || 'Не определен'}
              </div>
              <div>
                <strong>API Ключ:</strong> {diagnosticResults.connectionInfo?.keyExists ? 'Определен' : 'Не определен'}
              </div>
              <div>
                <strong>Подключение:</strong> {
                  diagnosticResults.connectionInfo?.connected 
                    ? '✅ Успешно' 
                    : '❌ Ошибка'
                }
              </div>
              {diagnosticResults.networkInfo?.connectionTime && (
                <div>
                  <strong>Время подключения:</strong> {diagnosticResults.networkInfo.connectionTime} мс
                </div>
              )}
              {diagnosticResults.connectionInfo?.error && (
                <div className="mt-4">
                  <h3 className="font-medium text-red-700">Детали ошибки:</h3>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-60 text-sm">
                    {JSON.stringify(diagnosticResults.connectionInfo.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          {/* Дополнительная информация */}
          {diagnosticResults.connectionInfo?.connected && (
            <>
              <div className="p-4 bg-gray-50 border rounded-md">
                <h2 className="text-lg font-medium mb-2">Информация о сервисах</h2>
                <div className="space-y-2">
                  <div>
                    <strong>Функции RPC:</strong> {
                      diagnosticResults.rpcAvailable 
                        ? '✅ Доступны' 
                        : '❌ Недоступны'
                    }
                  </div>
                  {diagnosticResults.authInfo && (
                    <div>
                      <strong>Аутентификация:</strong> {
                        diagnosticResults.authInfo.isAuthenticated 
                          ? `✅ Аутентифицирован (${diagnosticResults.authInfo.role})` 
                          : '❌ Не аутентифицирован'
                      }
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h2 className="text-lg font-medium mb-2">Рекомендации по устранению проблем</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Проверьте правильность URL и ключа API в файле <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
                  <li>Убедитесь, что вы правильно настроили политики доступа (RLS) в Supabase</li>
                  <li>Если функции RPC недоступны, нажмите кнопку "Создать диагностическую функцию"</li>
                  <li>Если таблицы не существуют, выполните скрипт <code className="bg-gray-100 px-1 rounded">supabase-reset-schema.sql</code></li>
                </ul>
              </div>
            </>
          )}
          
          <div className="flex space-x-4">
            <button
              onClick={testConnection}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md"
            >
              Обновить диагностику
            </button>
            
            <button
              onClick={createDiagnosticFunction}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md"
            >
              Создать диагностическую функцию
            </button>
          </div>
        </div>
      )}
    </div>
  );
}