'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function TestVisionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('text');

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

      const response = await fetch('/api/test-vision-api', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Произошла ошибка при обработке запроса');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при отправке запроса');
    } finally {
      setIsLoading(false);
    }
  };

  const renderJson = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Тест Google Cloud Vision API</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Загрузка файла</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium mb-2">
                Выберите изображение или PDF-файл
              </label>
              <input
                type="file"
                id="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm"
              />
            </div>
            <Button type="submit" disabled={isLoading || !file}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Отправка...
                </>
              ) : (
                'Отправить в Google Cloud Vision'
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
            </div>

            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="text">Текст</TabsTrigger>
                <TabsTrigger value="documentText">Текст документа</TabsTrigger>
                <TabsTrigger value="labels">Метки</TabsTrigger>
                <TabsTrigger value="logos">Логотипы</TabsTrigger>
                <TabsTrigger value="colors">Цвета</TabsTrigger>
                <TabsTrigger value="raw">Сырые данные</TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <h3 className="font-semibold mb-2">Распознанный текст:</h3>
                <Textarea 
                  value={result.results.textDetection.fullText} 
                  readOnly 
                  className="h-[400px] font-mono text-sm" 
                />
              </TabsContent>

              <TabsContent value="documentText">
                <h3 className="font-semibold mb-2">Распознанный текст документа:</h3>
                <Textarea 
                  value={result.results.documentTextDetection.fullText} 
                  readOnly 
                  className="h-[400px] font-mono text-sm" 
                />
                {result.results.documentTextDetection.pages && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Информация о страницах:</h4>
                    {result.results.documentTextDetection.pages.map((page: any, index: number) => (
                      <div key={index} className="mb-2">
                        <p>Страница {index + 1}: {page.width}x{page.height} пикселей</p>
                        <p>Блоков: {page.blocks}, Параграфов: {page.paragraphs}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="labels">
                <h3 className="font-semibold mb-2">Обнаруженные метки:</h3>
                <div className="overflow-auto max-h-[400px]">
                  <table className="min-w-full border">
                    <thead>
                      <tr>
                        <th className="border px-4 py-2">Метка</th>
                        <th className="border px-4 py-2">Уверенность</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.labelDetection.labels.map((label: any, index: number) => (
                        <tr key={index}>
                          <td className="border px-4 py-2">{label.description}</td>
                          <td className="border px-4 py-2">{(label.score * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="logos">
                <h3 className="font-semibold mb-2">Обнаруженные логотипы:</h3>
                {result.results.logoDetection.logos.length > 0 ? (
                  <div className="overflow-auto max-h-[400px]">
                    <table className="min-w-full border">
                      <thead>
                        <tr>
                          <th className="border px-4 py-2">Логотип</th>
                          <th className="border px-4 py-2">Уверенность</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.logoDetection.logos.map((logo: any, index: number) => (
                          <tr key={index}>
                            <td className="border px-4 py-2">{logo.description}</td>
                            <td className="border px-4 py-2">{(logo.score * 100).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>Логотипы не обнаружены</p>
                )}
              </TabsContent>

              <TabsContent value="colors">
                <h3 className="font-semibold mb-2">Доминирующие цвета:</h3>
                <div className="flex flex-wrap gap-2">
                  {result.results.imageProperties.dominantColors.map((color: any, index: number) => {
                    const { red, green, blue } = color.color;
                    const rgb = `rgb(${red}, ${green}, ${blue})`;
                    return (
                      <div 
                        key={index}
                        className="p-1 rounded border"
                        style={{ width: '100px' }}
                      >
                        <div 
                          className="h-20 w-full rounded mb-1" 
                          style={{ backgroundColor: rgb }}
                        />
                        <p className="text-xs text-center">
                          RGB({red}, {green}, {blue})
                        </p>
                        <p className="text-xs text-center">
                          {(color.score * 100).toFixed(2)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="raw">
                <h3 className="font-semibold mb-2">Полные данные ответа:</h3>
                <Textarea 
                  value={renderJson(result)} 
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