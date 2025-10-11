'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InvoiceData } from '@/services/invoice-recognition';
import { Loader2, FileText, Upload, X } from 'lucide-react';
import Image from 'next/image';

export default function InvoiceRecognition() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedData, setRecognizedData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Обработка выбора файла
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setError(null);
    setRecognizedData(null);
    
    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      return;
    }

    // Проверка типа файла (только изображения)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Пожалуйста, выберите изображение (JPEG, PNG, WEBP, HEIC)');
      return;
    }

    // Проверка размера файла (максимум 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10MB');
      return;
    }

    setFile(selectedFile);

    // Создание превью для изображений
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Очистка выбранного файла
  const handleClearFile = () => {
    setFile(null);
    setPreview(null);
    setRecognizedData(null);
    setError(null);
    setSuggestions([]);
  };

  // Обработка распознавания счета
  const handleRecognize = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setSuggestions([]);
    
    try {
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('file', file);
      
      // Используем новый чистый API
      const apiUrl = '/api/invoice-ocr';
      
      // Отправляем запрос на API-маршрут распознавания
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      
      // Проверяем, что ответ в формате JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Сервер вернул не JSON-ответ. Возможно, произошла внутренняя ошибка сервера.');
      }
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // Если сервер вернул рекомендации, сохраняем их
        if (responseData.suggestions && Array.isArray(responseData.suggestions)) {
          setSuggestions(responseData.suggestions);
        } else {
          setSuggestions(['Попробуйте изображение лучшего качества']);
        }
        
        throw new Error(responseData.error || 'Ошибка при обработке запроса');
      }
      
      // Проверяем наличие распознанного текста
      if (responseData.rawText) {
        setRecognizedData(responseData);
        setSuggestions([]);
      } else {
        // Если текст не распознан, но API не вернул ошибку
        if (responseData.suggestions && Array.isArray(responseData.suggestions)) {
          setSuggestions(responseData.suggestions);
        } else {
          setSuggestions(['Попробуйте изображение лучшего качества']);
        }
        throw new Error('Не удалось распознать текст в документе.');
      }
    } catch (err) {
      console.error('Ошибка при распознавании счета:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при распознавании счета. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Панель загрузки файла */}
      <Card>
        <CardHeader>
          <CardTitle>Загрузка счета</CardTitle>
          <CardDescription>
            Загрузите четкое изображение счета для распознавания.
            Для лучшего результата используйте файлы хорошего качества без бликов и теней.
          </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input 
                  id="invoice-file" 
                  type="file" 
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  disabled={isProcessing}
                />
                {file && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClearFile}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-medium text-red-700 mb-2">{error}</p>
                  
                  {suggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-red-700 mb-1">Рекомендации:</p>
                      <ul className="text-xs text-red-600 list-disc pl-5 space-y-1">
                        {suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Рекомендации по загрузке файлов */}
              {!file && !isProcessing && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Рекомендации для лучшего распознавания:</h4>
                  <ul className="text-xs text-blue-700 list-disc pl-5 space-y-1">
                    <li>Используйте четкие изображения без размытия</li>
                    <li>Убедитесь, что весь документ попадает в кадр</li>
                    <li>Избегайте бликов, теней и скошенных углов</li>
                    <li>Лучше всего работает с отсканированными документами</li>
                  </ul>
                </div>
              )}

              {file && (
                <div className="border rounded-md p-3 flex items-center gap-3">
                  {preview ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                      <Image
                        src={preview}
                        alt="Превью счета"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • {file.type}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleRecognize} 
              disabled={!file || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Выполняется распознавание...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Распознать документ
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Результаты распознавания */}
        <Card>
          <CardHeader>
            <CardTitle>Результаты распознавания</CardTitle>
            <CardDescription>
              Извлеченные данные из счета
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-medium">Распознавание документа</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Пожалуйста, подождите. Это может занять некоторое время...
                </p>
              </div>
            ) : recognizedData ? (
              <div className="space-y-4">
                {/* Проверка наличия ключевых данных */}
                {!recognizedData.invoiceNumber && !recognizedData.date && !recognizedData.total && !recognizedData.vendor && (
                  <div className="p-3 mb-2 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-700">
                      <strong>Внимание!</strong> Основные данные счета не были распознаны. Попробуйте загрузить изображение лучшего качества или другой формат документа.
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Номер счета</p>
                    <p className="text-sm">{recognizedData.invoiceNumber || 'Не распознано'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Дата</p>
                    <p className="text-sm">{recognizedData.date || 'Не распознано'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Поставщик</p>
                    <p className="text-sm">{recognizedData.vendor || 'Не распознано'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Сумма</p>
                    <p className="text-sm">{recognizedData.total ? `${recognizedData.total} руб.` : 'Не распознано'}</p>
                  </div>
                </div>

                {recognizedData.items && recognizedData.items.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Товары/услуги</p>
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Описание</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Кол-во</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recognizedData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm">{item.description || 'Не указано'}</td>
                              <td className="px-3 py-2 text-sm text-right">{item.quantity || '-'}</td>
                              <td className="px-3 py-2 text-sm text-right">{item.price ? `${item.price} руб.` : '-'}</td>
                              <td className="px-3 py-2 text-sm text-right">{item.amount ? `${item.amount} руб.` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Распознанный текст</p>
                  <div className="border rounded-md p-3 text-xs font-mono bg-gray-50 overflow-auto max-h-[150px] whitespace-pre-wrap">
                    {recognizedData.rawText 
                      ? recognizedData.rawText 
                      : <span className="text-red-500">Текст не распознан. Попробуйте изображение лучшего качества.</span>}
                  </div>
                  {recognizedData.rawText && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Длина текста: {recognizedData.rawText.length} символов, {recognizedData.rawText.split('\n').length} строк
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium">Нет данных</h3>
                <p className="text-sm text-muted-foreground">
                  Загрузите счет и нажмите кнопку "Распознать документ", чтобы увидеть результаты
                </p>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}