'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label-simple"
import { Card } from "@/components/ui/card"

export default function TestInvoiceRecognition() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Пожалуйста, выберите файл");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Используем тестовый API-маршрут вместо реального с явным указанием хоста и порта
      // В реальном приложении лучше использовать window.location.origin
      const apiUrl = `http://localhost:3456/api/test-recognition`;
      console.log('Отправка запроса на:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      
      // Проверяем тип контента, чтобы убедиться, что это JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Сервер вернул не JSON-ответ: ${contentType}`);
      }
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Произошла ошибка при обработке файла');
        console.error('Ошибка:', data);
      }
    } catch (err: any) {
      // Проверяем на специфическую ошибку парсинга JSON
      if (err.message && err.message.includes('Unexpected token')) {
        setError('Сервер вернул HTML вместо JSON. Возможно, произошла внутренняя ошибка сервера или проблема с аутентификацией Google Cloud Vision API.');
        console.error('Ошибка парсинга JSON:', err.message);
      } else {
        setError(`Произошла ошибка при отправке запроса: ${err.message}`);
        console.error('Ошибка:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Тест распознавания счетов</h1>
      
      <div className="grid gap-10">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                <p className="text-sm text-gray-500 mt-2">
                  Выбран файл: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button 
                type="submit" 
                disabled={!file || isLoading} 
                className="w-full"
              >
                {isLoading ? 'Обработка...' : 'Распознать файл'}
              </Button>
              
              <Button 
                type="button" 
                className="w-full border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700"
                onClick={resetForm} 
                disabled={isLoading}
              >
                Очистить
              </Button>
            </div>
          </form>
        </Card>
        
        {error && (
          <Card className="p-6 border border-red-300 bg-red-50">
            <h3 className="text-xl text-red-700 font-semibold">Ошибка</h3>
            <p className="mt-2 text-red-700">{error}</p>
          </Card>
        )}
        
        {result && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Результат распознавания</h3>
              
              {result.processingNotes && result.processingNotes.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-medium mb-2">Процесс обработки:</h4>
                  <ul className="space-y-1 list-disc pl-6">
                    {result.processingNotes.map((note: string, i: number) => (
                      <li key={i} dangerouslySetInnerHTML={{__html: note}} />
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <h4 className="text-lg font-medium mb-2">Распознанный текст:</h4>
                <div className="p-4 bg-gray-100 rounded-md whitespace-pre-wrap font-mono text-sm">
                  {result.fullText || "Текст не был распознан"}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}