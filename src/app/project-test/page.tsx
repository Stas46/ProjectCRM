'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProjectCreateTest() {
  const [result, setResult] = useState<{
    success?: boolean;
    error?: any;
    data?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateProject = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            title: 'Тестовый проект',
            client: 'Тестовый клиент',
            address: 'Тестовый адрес',
            status: 'planning',
            due_date: '2025-12-31',
            budget: 100000,
            description: 'Тестовое описание проекта'
          }
        ])
        .select();

      if (error) {
        console.error('Ошибка при создании проекта:', error);
        setResult({ success: false, error });
      } else {
        console.log('Проект успешно создан:', data);
        setResult({ success: true, data });
      }
    } catch (error) {
      console.error('Исключение при создании проекта:', error);
      setResult({ success: false, error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Тест создания проекта</h1>
      
      <button
        onClick={handleCreateProject}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md ${isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white font-medium`}
      >
        {isLoading ? 'Выполняется...' : 'Создать тестовый проект'}
      </button>
      
      {result && (
        <div className={`mt-4 p-4 border rounded-md ${result.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <h2 className={`font-bold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.success ? 'Успешно!' : 'Ошибка!'}
          </h2>
          
          {result.success ? (
            <div className="text-green-700 mt-2">
              <p>Проект успешно создан.</p>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-60">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-red-700 mt-2">
              <p>Ошибка при создании проекта:</p>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-60">
                {JSON.stringify(result.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}