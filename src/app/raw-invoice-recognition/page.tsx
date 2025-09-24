'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function RawInvoiceRecognitionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recognitionType, setRecognitionType] = useState('documentTextDetection');
  const [language, setLanguage] = useState('en');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    
    if (!file) {
      setError('Пожалуйста, выберите файл');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('recognitionType', recognitionType);
      formData.append('language', language);

      console.log('Отправляем запрос на', '/api/raw-invoice-recognition');
      
      const response = await fetch('/api/raw-invoice-recognition', {
        method: 'POST',
        body: formData,
      });
      
      // Проверяем, что ответ в формате JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Если ответ не JSON, получаем текст ответа для диагностики
        const textResponse = await response.text();
        console.error('Ответ не в формате JSON:', textResponse);
        throw new Error(`Получен неверный формат ответа: ${contentType || 'не указан'}. Начало ответа: ${textResponse.substring(0, 100)}...`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Произошла ошибка при обработке запроса');
      }

      setResult(data);
      console.log('Полученные данные:', data);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при отправке запроса');
      console.error('Ошибка:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderJson = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Текст скопирован в буфер обмена');
      })
      .catch(err => {
        console.error('Ошибка при копировании:', err);
      });
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Тестирование распознавания счетов (сырые данные)</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Загрузка счета</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium mb-2">
                Выберите изображение или PDF-файл со счетом
              </label>
              <input
                type="file"
                id="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Тип распознавания
              </label>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="documentTextDetection"
                    name="recognitionType"
                    value="documentTextDetection"
                    checked={recognitionType === 'documentTextDetection'}
                    onChange={(e) => setRecognitionType(e.target.value)}
                  />
                  <label htmlFor="documentTextDetection">Document Text Detection (для структурированных документов)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="textDetection"
                    name="recognitionType"
                    value="textDetection"
                    checked={recognitionType === 'textDetection'}
                    onChange={(e) => setRecognitionType(e.target.value)}
                  />
                  <label htmlFor="textDetection">Text Detection (для обычного текста)</label>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="language" className="block text-sm font-medium mb-2">
                Язык документа
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>
            
            <Button type="submit" disabled={isLoading || !file}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Отправка...
                </>
              ) : (
                'Распознать счет'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-400">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700">Ошибка</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Результаты распознавания</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p><strong>Имя файла:</strong> {result.fileName}</p>
              <p><strong>Тип файла:</strong> {result.fileType}</p>
              <p><strong>Размер файла:</strong> {(result.fileSize / 1024).toFixed(2)} KB</p>
              <p><strong>Тип распознавания:</strong> {result.recognitionType}</p>
              <p><strong>Язык:</strong> {result.language}</p>
              
              {result.processingNotes && result.processingNotes.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 rounded">
                  <p className="font-semibold">Примечания по обработке:</p>
                  
                  {/* Извлечение URLs изображений и отображение их в отдельном блоке */}
                  {(() => {
                    const imageUrls: {url: string, isEnhanced: boolean}[] = [];
                    
                    // Извлекаем все URL изображений из примечаний
                    result.processingNotes.forEach((note: string) => {
                      if (note.includes('/debug-images/')) {
                        const url = note.match(/\/debug-images\/[\/\w-]+\.png/)?.[0];
                        if (url) {
                          const isEnhanced = note.includes('черно-белая') || note.includes('enhanced');
                          imageUrls.push({ url, isEnhanced });
                        }
                      }
                    });
                    
                    // Если есть изображения, отображаем их в отдельном блоке
                    if (imageUrls.length > 0) {
                      return (
                        <div className="mb-4 mt-2 p-3 bg-gray-100 rounded border border-gray-300">
                          <p className="font-semibold mb-2">Отладочные изображения:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {imageUrls.map((item, idx) => (
                              <a 
                                key={idx}
                                href={item.url} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 bg-white rounded border border-gray-200 hover:bg-blue-50"
                              >
                                <div className="text-sm font-medium mb-1 text-blue-600">
                                  {item.isEnhanced 
                                    ? 'Улучшенная черно-белая версия' 
                                    : 'Оригинальная версия'}
                                </div>
                                <div className="aspect-video bg-gray-100 overflow-hidden rounded">
                                  <img 
                                    src={item.url}
                                    alt={item.isEnhanced ? "Улучшенная версия" : "Оригинальная версия"}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Остальные примечания без URL */}
                  <ul className="list-disc pl-5">
                    {result.processingNotes.map((note: string, index: number) => {
                      // Отображаем только примечания без URL изображений
                      if (!note.includes('/debug-images/')) {
                        return <li key={index}>{note}</li>;
                      }
                      return null;
                    })}
                  </ul>
                </div>
              )}
            </div>

            <Tabs defaultValue="fullText">
              <TabsList className="mb-4">
                <TabsTrigger value="fullText">Распознанный текст</TabsTrigger>
                <TabsTrigger value="rawData">Сырые данные</TabsTrigger>
              </TabsList>

              <TabsContent value="fullText">
                <div className="mb-2 flex justify-between items-center">
                  <h3 className="font-semibold">Полный распознанный текст:</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => result.fullText && copyToClipboard(result.fullText)}
                  >
                    Скопировать
                  </Button>
                </div>
                <Textarea 
                  value={result.fullText || "Текст не распознан"} 
                  readOnly 
                  className="h-[400px] font-mono text-sm" 
                />
              </TabsContent>

              <TabsContent value="rawData">
                <div className="mb-2 flex justify-between items-center">
                  <h3 className="font-semibold">Сырой ответ API:</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(renderJson(result.rawResponse))}
                  >
                    Скопировать
                  </Button>
                </div>
                <Textarea 
                  value={renderJson(result.rawResponse)} 
                  readOnly 
                  className="h-[400px] font-mono text-xs" 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}