'use client';

import { useState, useEffect } from 'react';

export default function ApiTest() {
  const [getResponse, setGetResponse] = useState<any>(null);
  const [postResponse, setPostResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  async function testGetApi() {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = `${window.location.origin}/api/test`;
      console.log('Отправка GET запроса на:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      // Проверяем тип контента
      const contentType = response.headers.get('content-type');
      console.log('Получен ответ с Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.log('Получен не JSON ответ:', text.substring(0, 100) + '...');
        throw new Error(`Сервер вернул не JSON-ответ: ${contentType}`);
      }
      
      const data = await response.json();
      setGetResponse(data);
    } catch (err: any) {
      console.error('Ошибка GET запроса:', err);
      setError(`Ошибка GET запроса: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }
  
  async function testPostApi() {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = `${window.location.origin}/api/test`;
      console.log('Отправка POST запроса на:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      });
      
      // Проверяем тип контента
      const contentType = response.headers.get('content-type');
      console.log('Получен ответ с Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.log('Получен не JSON ответ:', text.substring(0, 100) + '...');
        throw new Error(`Сервер вернул не JSON-ответ: ${contentType}`);
      }
      
      const data = await response.json();
      setPostResponse(data);
    } catch (err: any) {
      console.error('Ошибка POST запроса:', err);
      setError(`Ошибка POST запроса: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Тест API</h1>
      
      <div className="grid gap-6">
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Тест GET API</h2>
          <button 
            onClick={testGetApi}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : 'Отправить GET запрос'}
          </button>
          
          {getResponse && (
            <div className="mt-4">
              <h3 className="font-medium">Ответ:</h3>
              <pre className="bg-gray-100 p-3 rounded mt-2 text-sm overflow-auto max-h-60">
                {JSON.stringify(getResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Тест POST API</h2>
          <button 
            onClick={testPostApi}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : 'Отправить POST запрос'}
          </button>
          
          {postResponse && (
            <div className="mt-4">
              <h3 className="font-medium">Ответ:</h3>
              <pre className="bg-gray-100 p-3 rounded mt-2 text-sm overflow-auto max-h-60">
                {JSON.stringify(postResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        {error && (
          <div className="p-4 border border-red-300 bg-red-50 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Информация о среде</h2>
          <div className="grid gap-2">
            <div><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Недоступно'}</div>
            <div><strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Недоступно'}</div>
            <div><strong>Hostname:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'Недоступно'}</div>
            <div><strong>Port:</strong> {typeof window !== 'undefined' ? window.location.port : 'Недоступно'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}