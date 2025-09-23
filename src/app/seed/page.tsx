'use client';

import { useState } from 'react';
import { seedDatabase } from '@/lib/seed-database';

export default function SeedPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: any;
  } | null>(null);

  const handleSeedDatabase = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      
      const seedResult = await seedDatabase();
      setResult(seedResult);
    } catch (error) {
      setResult({ success: false, error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Заполнение базы данных тестовыми данными</h1>
      
      <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md mb-4">
        <p className="text-yellow-800 font-medium">⚠️ Внимание! Эта операция заполнит базу данных тестовыми данными.</p>
        <p className="text-yellow-700 mt-2">Используйте только для разработки и тестирования.</p>
      </div>
      
      <button
        onClick={handleSeedDatabase}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md ${isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white font-medium`}
      >
        {isLoading ? 'Выполняется...' : 'Заполнить базу данных'}
      </button>
      
      {result && (
        <div className={`mt-4 p-4 border rounded-md ${result.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <h2 className={`font-bold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.success ? 'Успешно!' : 'Ошибка!'}
          </h2>
          {result.success ? (
            <p className="text-green-700 mt-2">База данных успешно заполнена тестовыми данными.</p>
          ) : (
            <div className="text-red-700 mt-2">
              <p>Произошла ошибка при заполнении базы данных:</p>
              <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto">
                {result.error ? JSON.stringify(result.error, null, 2) : 'Неизвестная ошибка'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}