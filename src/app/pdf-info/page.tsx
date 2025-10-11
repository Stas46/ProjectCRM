'use client';

import { useState } from 'react';

export default function PdfInfoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<{size: number, name: string} | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setImageUrl(null);
      setPdfInfo(null);
    } else {
      setError('Пожалуйста, выберите PDF файл');
      setFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Пожалуйста, выберите файл');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImageUrl(null);
    setPdfInfo(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/pdf-info', {
        method: 'POST',
        body: formData,
      });

      if (response.ok && response.headers.get('content-type')?.includes('image')) {
        // Если получили изображение
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        
        // Извлекаем информацию из заголовков
        const size = response.headers.get('X-PDF-Size');
        const name = response.headers.get('X-PDF-Name');
        if (size && name) {
          setPdfInfo({
            size: parseInt(size),
            name: name
          });
        }
      } else {
        // Если получили ошибку
        const data = await response.json();
        setError(data.error || 'Произошла ошибка при обработке');
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
          Обработка PDF файлов
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-blue-800 font-medium">💡 Этот метод:</div>
            <ul className="text-blue-700 text-sm mt-2 list-disc list-inside">
              <li>Получает PDF файл и создает информационное изображение</li>
              <li>Подготавливает файл для дальнейшей обработки</li>
              <li>Работает без извлечения текста из PDF</li>
              <li>Готовит данные для Google Vision OCR</li>
            </ul>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="text-sm text-gray-600">
                Выбранный файл: {file.name} ({Math.round(file.size / 1024)} КБ)
              </div>
            )}
            
            <button
              type="submit"
              disabled={!file || isLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Обработка PDF...' : 'Обработать PDF файл'}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium">Ошибка:</div>
              <div className="text-red-700">{error}</div>
            </div>
          )}
          
          {imageUrl && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Результат обработки</h3>
              
              <div className="mb-6">
                <div className="text-green-600 font-medium">
                  ✅ PDF файл успешно обработан и готов к распознаванию
                </div>
                {pdfInfo && (
                  <div className="text-sm text-gray-600 mt-2">
                    📊 Файл: {pdfInfo.name} | Размер: {Math.round(pdfInfo.size / 1024)} КБ
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-3">Информационное изображение:</h4>
                <div className="max-w-full overflow-auto">
                  <img 
                    src={imageUrl} 
                    alt="PDF информация"
                    className="max-w-full h-auto border border-gray-300 rounded"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <a 
                    href={imageUrl}
                    download="pdf-info.png"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Скачать изображение
                  </a>
                  <p className="text-sm text-gray-600 flex items-center">
                    📝 Следующий шаг: использовать Google Vision OCR для распознавания текста
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}