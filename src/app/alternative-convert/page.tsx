'use client';

import { useState } from 'react';

export default function AlternativePdfConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Пожалуйста, выберите PDF файл');
      setFile(null);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError('Пожалуйста, выберите файл');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/alternative-pdf-convert', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Произошла ошибка при конвертации');
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при отправке запроса');
      console.error('Ошибка:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Альтернативная обработка PDF
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h2 className="font-bold text-blue-800 mb-2">💡 Что делает этот инструмент:</h2>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Извлекает текст из PDF файла</li>
            <li>• Создает изображение-заглушку с информацией о файле</li>
            <li>• Работает без внешних зависимостей</li>
            <li>• Показывает что нужно для полной конвертации</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
                Выберите PDF файл:
              </label>
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            {file && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <strong>Выбранный файл:</strong> {file.name}<br/>
                <strong>Размер:</strong> {Math.round(file.size / 1024)} КБ
              </div>
            )}
            
            <button
              onClick={handleConvert}
              disabled={!file || isLoading}
              className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Обрабатываем...' : 'Обработать PDF альтернативным способом'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium">Ошибка:</div>
              <div className="text-red-700">{error}</div>
            </div>
          )}
        </div>
        
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="text-gray-600">Обрабатываем PDF альтернативными методами...</span>
            </div>
          </div>
        )}
        
        {result && (
          <div className="space-y-6">
            {/* Краткая сводка */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-green-800">✅ Обработка завершена!</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-green-800">Результат</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Файл:</strong> {result.fileName}</div>
                    <div><strong>Размер:</strong> {Math.round(result.fileSize / 1024)} КБ</div>
                    <div><strong>Текст извлечен:</strong> {result.textExtracted ? '✅ Да' : '❌ Нет'}</div>
                    <div><strong>Изображение создано:</strong> {result.imageCreated ? '✅ Да' : '❌ Нет'}</div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-blue-800">Статус</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Сообщение:</strong> {result.message}</div>
                    <div><strong>Методов опробовано:</strong> {result.results.length}</div>
                    <div><strong>Успешных:</strong> {result.results.filter((r: any) => r.status === 'success').length}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Рекомендации */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Рекомендации</h3>
              <div className="space-y-2">
                {result.recommendations.map((rec: string, index: number) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    rec.includes('✅') ? 'bg-green-50 text-green-800' :
                    rec.includes('❌') ? 'bg-red-50 text-red-800' :
                    'bg-yellow-50 text-yellow-800'
                  }`}>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Извлеченный текст */}
            {result.extractedText && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Извлеченный текст из PDF</h3>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {result.extractedText}
                  </pre>
                </div>
              </div>
            )}
            
            {/* Созданное изображение */}
            {result.imageUrl && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Изображение-заглушка</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <img 
                    src={result.imageUrl} 
                    alt="Изображение-заглушка PDF"
                    className="max-w-full h-auto border rounded shadow-md mx-auto"
                  />
                  
                  <div className="mt-4 flex justify-center space-x-4">
                    <a 
                      href={result.imageUrl} 
                      download
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Скачать изображение
                    </a>
                    <a 
                      href={result.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Открыть в новой вкладке
                    </a>
                  </div>
                </div>
              </div>
            )}
            
            {/* Подробные результаты методов */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Подробные результаты методов</h3>
              <div className="space-y-4">
                {result.results.map((method: any, index: number) => (
                  <div key={index} className={`border rounded-lg p-4 ${
                    method.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-lg">{method.method}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        method.status === 'success' 
                          ? 'bg-green-200 text-green-800' 
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {method.status === 'success' ? 'УСПЕХ' : 'ОШИБКА'}
                      </span>
                    </div>
                    
                    {method.status === 'success' ? (
                      <div className="text-sm">
                        {method.result && (
                          <div className="space-y-1">
                            {method.result.pages && <div><strong>Страниц:</strong> {method.result.pages}</div>}
                            {method.result.textLength && <div><strong>Символов текста:</strong> {method.result.textLength}</div>}
                            {method.result.imageSize && <div><strong>Размер изображения:</strong> {Math.round(method.result.imageSize / 1024)} КБ</div>}
                            {method.result.note && <div className="text-blue-600 italic"><strong>Примечание:</strong> {method.result.note}</div>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-700 text-sm">
                        <strong>Ошибка:</strong> {method.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Этот инструмент работает без внешних зависимостей и показывает альтернативные способы обработки PDF
          </p>
        </div>
      </div>
    </div>
  );
}