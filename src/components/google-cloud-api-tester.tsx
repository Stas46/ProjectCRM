'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, AlertTriangle } from 'lucide-react';

export default function GoogleCloudApiTester() {
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<'unchecked' | 'success' | 'error'>('unchecked');
  const [message, setMessage] = useState<string | null>(null);

  const checkApiSetup = async () => {
    setIsChecking(true);
    setStatus('unchecked');
    setMessage(null);

    try {
      // Вызов API для проверки настроек
      const response = await fetch('/api/check-google-credentials');
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('Google Cloud Vision API настроен корректно! Учетные данные действительны.');
      } else {
        setStatus('error');
        setMessage(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Проверка настроек Google Cloud Vision API</CardTitle>
        <CardDescription>
          Используйте эту утилиту для проверки правильности настройки учетных данных Google Cloud Vision API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start">
              <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 shrink-0" />
              <p className="text-green-700 text-sm">{message}</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 shrink-0" />
              <p className="text-red-700 text-sm">{message}</p>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            <p className="mb-2">Этот тест проверяет:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Наличие файла учетных данных Google Cloud</li>
              <li>Корректность формата файла учетных данных</li>
              <li>Действительность учетных данных</li>
              <li>Настройку переменных окружения</li>
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={checkApiSetup} 
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Проверка...
            </>
          ) : (
            'Проверить настройки API'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}