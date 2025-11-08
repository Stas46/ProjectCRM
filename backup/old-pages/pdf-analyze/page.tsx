'use client';

import { useState } from 'react';

export default function PdfAnalyzePage() {
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

  const handleAnalyze = async () => {
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

      const response = await fetch('/api/pdf-analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Произошла ошибка при анализе');
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
          Анализ структуры PDF файла
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
                Выберите PDF файл для анализа:
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
              onClick={handleAnalyze}
              disabled={!file || isLoading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Анализируем...' : 'Анализировать PDF'}
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
              <span className="text-gray-600">Анализируем структуру PDF...</span>
            </div>
          </div>
        )}
        
        {result && (
          <div className="space-y-6">
            {/* Основная информация */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-green-800">✅ Анализ завершен!</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-blue-800">Основная информация</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Файл:</strong> {result.fileName}</div>
                    <div><strong>Размер:</strong> {Math.round(result.fileSize / 1024)} КБ</div>
                    <div><strong>Страниц:</strong> {result.pageCount}</div>
                    <div><strong>Статус:</strong> {result.message}</div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-green-800">Метаданные</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Название:</strong> {result.metadata.title}</div>
                    <div><strong>Автор:</strong> {result.metadata.author}</div>
                    <div><strong>Создатель:</strong> {result.metadata.creator}</div>
                    <div><strong>Создан:</strong> {result.metadata.creationDate !== 'Не указано' ? new Date(result.metadata.creationDate).toLocaleString() : 'Не указано'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Информация о страницах */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Структура страниц</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.pages.map((page: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-bold text-md mb-2">Страница {page.pageNumber}</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Размер:</strong> {page.size.width} × {page.size.height}</div>
                      <div><strong>Формат:</strong> {page.size.width > page.size.height ? 'Альбомная' : 'Портретная'}</div>
                      <div><strong>Пропорции:</strong> {(page.size.width / page.size.height).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Полные метаданные */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Полные метаданные</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 font-bold">Название:</td>
                      <td className="py-2">{result.metadata.title}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-bold">Автор:</td>
                      <td className="py-2">{result.metadata.author}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-bold">Тема:</td>
                      <td className="py-2">{result.metadata.subject}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-bold">Создатель:</td>
                      <td className="py-2">{result.metadata.creator}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-bold">Производитель:</td>
                      <td className="py-2">{result.metadata.producer}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-bold">Дата создания:</td>
                      <td className="py-2">
                        {result.metadata.creationDate !== 'Не указано' 
                          ? new Date(result.metadata.creationDate).toLocaleString() 
                          : 'Не указано'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-bold">Дата изменения:</td>
                      <td className="py-2">
                        {result.metadata.modificationDate !== 'Не указано' 
                          ? new Date(result.metadata.modificationDate).toLocaleString() 
                          : 'Не указано'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Примечание */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2 text-yellow-800">💡 Важно</h3>
              <p className="text-yellow-700">{result.note}</p>
            </div>
          </div>
        )}
        
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Этот инструмент использует pdf-lib для анализа структуры и метаданных PDF файлов без конвертации в изображения
          </p>
        </div>
      </div>
    </div>
  );
}