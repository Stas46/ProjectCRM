'use client';

import { useState } from 'react';

export default function SimplePdfConvertPage() {
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

      const response = await fetch('/api/simple-pdf-convert', {
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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Простая конвертация PDF в изображение
        </h1>
        
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
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Конвертируем...' : 'Конвертировать в изображение'}
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Конвертируем PDF в изображение...</span>
            </div>
          </div>
        )}
        
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-green-800">✅ Успешно!</h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Исходный файл:</strong> {result.fileName}</div>
                  <div><strong>Метод:</strong> {result.method}</div>
                  <div><strong>Размер изображения:</strong> {Math.round(result.imageSize / 1024)} КБ</div>
                  <div><strong>Статус:</strong> {result.message}</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold mb-2">Результат конвертации:</h3>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img 
                    src={result.imageUrl} 
                    alt="Конвертированное изображение PDF"
                    className="max-w-full h-auto border rounded shadow-md"
                  />
                </div>
                
                <div className="mt-4 flex space-x-4">
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
          </div>
        )}
        
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Этот инструмент использует pdf2pic для конвертации PDF в изображения PNG высокого качества
          </p>
        </div>
      </div>
    </div>
  );
}