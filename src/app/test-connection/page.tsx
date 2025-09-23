'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ResultState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  data: any | null;
}

export default function SimpleConnectionTest() {
  const [result, setResult] = useState<ResultState>({
    status: 'idle',
    error: null,
    data: null
  });

  const testConnection = async () => {
    try {
      setResult({ status: 'loading', error: null, data: null });
      
      // Проверяем переменные окружения
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        setResult({
          status: 'error',
          error: 'Отсутствуют переменные окружения для Supabase',
          data: { url: url || 'отсутствует', key: key ? 'присутствует' : 'отсутствует' }
        });
        return;
      }
      
      // Тестовый запрос к базе данных
      const { data, error } = await supabase.from('projects').select('count', { count: 'exact', head: true });
      
      if (error) {
        setResult({
          status: 'error',
          error: error.message,
          data: { 
            url, 
            hasKey: true,
            errorDetails: error
          }
        });
      } else {
        setResult({
          status: 'success',
          error: null,
          data: {
            url,
            hasKey: true,
            connected: true
          }
        });
      }
    } catch (err: any) {
      setResult({
        status: 'error',
        error: err.message,
        data: null
      });
    }
  };

  const createTestProject = async () => {
    try {
      setResult({ status: 'loading', error: null, data: null });
      
      // Создаем тестовый проект
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            title: 'Тестовый проект',
            client: 'Тест клиент',
            address: 'Тестовый адрес',
            status: 'planning',
            description: 'Тестовое описание',
            due_date: '2025-12-31',
            budget: 100000
          }
        ])
        .select();
      
      if (error) {
        setResult({
          status: 'error',
          error: error.message,
          data: { 
            operation: 'insert',
            errorDetails: error
          }
        });
      } else {
        setResult({
          status: 'success',
          error: null,
          data: {
            operation: 'insert',
            project: data[0]
          }
        });
      }
    } catch (err: any) {
      setResult({
        status: 'error',
        error: err.message,
        data: { operation: 'insert' }
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Простой тест подключения к Supabase</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testConnection}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md"
        >
          Проверить подключение
        </button>
        
        <button
          onClick={createTestProject}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md ml-4"
        >
          Создать тестовый проект
        </button>
      </div>
      
      {result.status === 'loading' && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {result.status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-md">
          <h2 className="text-lg font-medium text-red-700 mb-2">Ошибка!</h2>
          <p className="text-red-700 mb-2">{result.error}</p>
          
          {result.data && (
            <div className="mt-4">
              <h3 className="font-medium">Детали:</h3>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-60 text-sm">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {result.status === 'success' && result.data && (
        <div className="p-4 bg-green-50 border border-green-300 rounded-md">
          <h2 className="text-lg font-medium text-green-700 mb-2">Успех!</h2>
          
          {result.data.operation === 'insert' ? (
            <div>
              <p className="text-green-700">Проект успешно создан!</p>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-60 text-sm">
                {JSON.stringify(result.data.project, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-green-700">Подключение к Supabase успешно установлено.</p>
          )}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-50 border rounded-md">
        <h2 className="text-lg font-medium mb-2">Решение проблем:</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Проверьте правильность URL и ключа в файле <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
          <li>Убедитесь, что база данных Supabase доступна и работает</li>
          <li>Проверьте сетевое подключение</li>
          <li>Запустите скрипт <code className="bg-gray-100 px-1 rounded">supabase-reset-schema.sql</code> для создания таблиц</li>
        </ul>
      </div>
    </div>
  );
}