'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label-simple"
import { Card } from "@/components/ui/card"

export default function TestCenter() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentPort, setCurrentPort] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Получаем информацию о текущем URL только на клиенте
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
      setCurrentPort(window.location.port || '80');
    }
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };
  
  const runTest = async (testType: string) => {
    if (!file && testType !== 'api-basic') {
      setError("Пожалуйста, выберите файл");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setActiveTest(testType);
    
    try {
      let apiUrl = '';
      let requestBody: any = null;
      let requestOptions: any = { method: 'GET' };
      
      // Получаем origin безопасным способом
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3456';
      
      switch (testType) {
        case 'api-basic':
          apiUrl = `${origin}/api/test`;
          break;
          
        case 'high-quality-pdf':
          apiUrl = `http://localhost:3456/api/test-recognition`;
          requestBody = new FormData();
          requestBody.append('file', file);
          requestOptions = { method: 'POST', body: requestBody };
          break;
          
        case 'pdf-conversion-test':
          apiUrl = `${origin}/api/pdf-conversion-test`;
          requestBody = new FormData();
          requestBody.append('file', file);
          requestOptions = { method: 'POST', body: requestBody };
          break;
          
        case 'vision-api-test':
          apiUrl = `${origin}/api/google-vision-clean`;
          requestBody = new FormData();
          requestBody.append('file', file);
          requestOptions = { method: 'POST', body: requestBody };
          break;

        case 'yandex-vision-test':
          apiUrl = `${origin}/api/yandex-vision-test`;
          requestBody = new FormData();
          requestBody.append('file', file);
          requestOptions = { method: 'POST', body: requestBody };
          break;
          
        default:
          throw new Error('Неизвестный тип теста');
      }
      
      console.log(`Отправка ${testType} запроса на:`, apiUrl);
      
      const response = await fetch(apiUrl, requestOptions);
      
      // Проверяем тип контента
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Сервер вернул не JSON-ответ: ${contentType}. Содержимое: ${text.substring(0, 200)}...`);
      }
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Произошла ошибка при обработке запроса');
        console.error('Ошибка:', data);
      }
    } catch (err: any) {
      setError(`Ошибка ${testType}: ${err.message}`);
      console.error('Ошибка:', err);
    } finally {
      setIsLoading(false);
      setActiveTest('');
    }
  };
  
  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setActiveTest('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const testButtons = [
    {
      id: 'api-basic',
      title: '🔧 Базовый тест API',
      description: 'Проверка работоспособности API сервера',
      needsFile: false,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'high-quality-pdf',
      title: '⭐ Высококачественная конвертация PDF',
      description: 'Тест новой системы с 300-400 DPI (рекомендуется для вашего Schet.pdf)',
      needsFile: true,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      id: 'pdf-conversion-test',
      title: '📄 Сравнение методов конвертации PDF',
      description: 'Тест всех доступных методов конвертации',
      needsFile: true,
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'vision-api-test',
      title: '👁️ Тест Google Vision API',
      description: 'Проверка настроек Google Cloud Vision',
      needsFile: true,
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      id: 'yandex-vision-test',
      title: '🇷🇺 Тест Yandex Vision OCR',
      description: 'Распознавание текста с помощью Yandex Vision (отлично для русского)',
      needsFile: true,
      color: 'bg-red-600 hover:bg-red-700'
    }
  ];

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">🧪 Центр тестирования</h1>
        <p className="text-lg text-gray-600">Все функции тестирования в одном месте</p>
      </div>
      
      <div className="grid gap-8">
        {/* Загрузка файла */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">📁 Загрузка файла</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file" className="text-base">Выберите файл (PDF или изображение)</Label>
              <div className="mt-2">
                <Input 
                  ref={fileInputRef}
                  id="file" 
                  type="file" 
                  accept=".pdf,image/*" 
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </div>
              {file && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm font-medium text-green-800">
                    ✅ Файл выбран: {file.name}
                  </p>
                  <p className="text-sm text-green-600">
                    Размер: {(file.size / 1024).toFixed(1)} KB | Тип: {file.type}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Кнопки тестов */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">🚀 Доступные тесты</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {testButtons.map((test) => (
              <div key={test.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg mb-2">{test.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{test.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {test.needsFile ? '📎 Требует файл' : '🔧 Без файла'}
                  </span>
                  <Button
                    onClick={() => runTest(test.id)}
                    disabled={isLoading || (test.needsFile && !file)}
                    className={`${test.color} text-white text-sm px-4 py-2`}
                  >
                    {isLoading && activeTest === test.id ? 'Выполняется...' : 'Запустить'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={resetForm}
              disabled={isLoading}
              className="border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700 px-6"
            >
              🔄 Очистить всё
            </Button>
          </div>
        </Card>

        {/* Информация о текущем сервере */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h2 className="text-xl font-semibold mb-3 text-blue-800">ℹ️ Информация о среде</h2>
          <div className="grid gap-2 text-sm">
            <div><strong>URL:</strong> {currentUrl || 'Загружается...'}</div>
            <div><strong>Порт:</strong> {currentPort || 'Загружается...'}</div>
            <div><strong>Статус:</strong> <span className="text-green-600 font-medium">🟢 Сервер запущен</span></div>
          </div>
        </Card>
        
        {/* Результаты */}
        {error && (
          <Card className="p-6 border border-red-300 bg-red-50">
            <h3 className="text-xl text-red-700 font-semibold mb-2">❌ Ошибка</h3>
            <p className="text-red-700">{error}</p>
          </Card>
        )}
        
        {result && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">✅ Результат тестирования</h3>
            
            {result.processingNotes && result.processingNotes.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-3">📋 Процесс обработки:</h4>
                <div className="space-y-2">
                  {result.processingNotes.map((note: string, i: number) => (
                    <div key={i} className="p-2 bg-gray-100 rounded text-sm" dangerouslySetInnerHTML={{__html: note}} />
                  ))}
                </div>
              </div>
            )}
            
            {result.fullText && (
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-3">📝 Распознанный текст:</h4>
                <div className="p-4 bg-gray-100 rounded-md whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto">
                  {result.fullText}
                </div>
              </div>
            )}
            
            {result.message && !result.fullText && (
              <div className="p-4 bg-blue-100 rounded-md">
                <p className="text-blue-800">{result.message}</p>
              </div>
            )}
            
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                🔍 Подробная информация (JSON)
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded-md text-xs overflow-auto max-h-60">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </Card>
        )}
      </div>
    </div>
  );
}