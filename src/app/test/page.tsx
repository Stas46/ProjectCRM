'use client';

import { useState, useEffect } from 'react';
import { checkConnection } from '@/lib/supabase';
import AppLayout from '@/components/app-layout';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const isConnected = await checkConnection();
        setConnectionStatus(isConnected ? 'success' : 'error');
        if (!isConnected) {
          setError('Не удалось подключиться к базе данных Supabase');
        }
      } catch (err) {
        console.error('Ошибка при проверке подключения:', err);
        setConnectionStatus('error');
        setError('Произошла ошибка при проверке подключения');
      }
    };

    testConnection();
  }, []);

  return (
    <AppLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Проверка подключения к Supabase</h1>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="mr-4">
              {connectionStatus === 'checking' && (
                <Loader2 size={48} className="text-blue-500 animate-spin" />
              )}
              
              {connectionStatus === 'success' && (
                <CheckCircle size={48} className="text-green-500" />
              )}
              
              {connectionStatus === 'error' && (
                <XCircle size={48} className="text-red-500" />
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-medium">
                {connectionStatus === 'checking' && 'Проверка подключения...'}
                {connectionStatus === 'success' && 'Подключение установлено!'}
                {connectionStatus === 'error' && 'Ошибка подключения'}
              </h2>
              
              {error && <p className="text-red-600 mt-1">{error}</p>}
              
              {connectionStatus === 'success' && (
                <p className="text-green-600 mt-1">Соединение с Supabase успешно установлено</p>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-medium mb-2">Информация о подключении:</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
              <p><strong>Ключ:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10)}...</p>
            </div>
          </div>
          
          {connectionStatus === 'error' && (
            <div className="mt-6">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Повторить попытку
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}