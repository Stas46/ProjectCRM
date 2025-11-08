'use client';

import { useState } from 'react';

interface PdfToPngResult {
  success: boolean;
  filename: string;
  pageCount: number;
  totalSizeKb: number;
  dpi: number;
  images: Array<{
    page: number;
    base64: string;
    width: number;
    height: number;
    size_kb: number;
  }>;
  ocrResults?: Array<{
    page: number;
    text: string;
    wordsCount: number;
    confidence?: number;
    error?: string;
  }>;
}

export default function PyMuPDFConverter() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PdfToPngResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState(0);
  const [dpi, setDpi] = useState(200);
  const [useOCR, setUseOCR] = useState(true);

  const handleConvert = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Пожалуйста, выберите PDF файл');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log(`🖼️ [CLIENT] Отправляем PDF в PyMuPDF конвертер: ${file.name}`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dpi', dpi.toString());
      formData.append('useOCR', useOCR.toString());

      const response = await fetch('/api/pdf-to-png', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      console.log(`✅ [CLIENT] PyMuPDF конвертер завершен: ${data.pageCount} страниц`);
      
      setResult(data);

    } catch (error: any) {
      console.error('❌ [CLIENT] Ошибка PyMuPDF конвертера:', error);
      setError(error.message || 'Произошла ошибка при конвертации PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = filename;
    link.click();
  };

  const downloadAllImages = () => {
    if (!result) return;
    
    result.images.forEach((img, index) => {
      setTimeout(() => {
        downloadImage(
          img.base64,
          `${result.filename.replace('.pdf', '')}_page_${img.page}.png`
        );
      }, index * 500);
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🖼️ PDF Конвертер + OCR (PDF → PNG + Text)
        </h1>
        
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выберите PDF файл для конвертации:
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleConvert}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Качество изображения (DPI):
            </label>
            <select
              value={dpi}
              onChange={(e) => setDpi(parseInt(e.target.value))}
              disabled={isLoading}
              className="block w-48 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value={150}>150 DPI (быстро)</option>
              <option value={200}>200 DPI (хорошо)</option>
              <option value={300}>300 DPI (отлично)</option>
              <option value={600}>600 DPI (максимум)</option>
            </select>
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useOCR}
                onChange={(e) => setUseOCR(e.target.checked)}
                disabled={isLoading}
                className="mr-2 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">
                🔍 Распознавать текст (Google Vision OCR)
              </span>
            </label>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
            <div className="ml-4">
              <span className="text-purple-600 font-medium block">
                Конвертируем PDF в PNG{useOCR && ' + распознаем текст'}...
              </span>
              <span className="text-gray-500 text-sm">
                PyMuPDF обрабатывает страницы{useOCR && ', затем Google Vision распознает текст'}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <span className="text-red-400 mr-2">❌</span>
              <div>
                <h3 className="text-sm font-medium text-red-800">Ошибка конвертации</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Статистика */}
            <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-purple-800 mb-3">📊 Результат конвертации:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-purple-700">
                <div>
                  <span className="font-medium">Файл:</span> {result.filename}
                </div>
                <div>
                  <span className="font-medium">Страниц:</span> {result.pageCount}
                </div>
                <div>
                  <span className="font-medium">Общий размер:</span> {result.totalSizeKb} KB
                </div>
                <div>
                  <span className="font-medium">DPI:</span> {result.dpi}
                </div>
                {result.ocrResults && (
                  <div>
                    <span className="font-medium">OCR:</span> {result.ocrResults.length} страниц распознано
                  </div>
                )}
              </div>
            </div>

            {/* Результаты OCR */}
            {result.ocrResults && result.ocrResults.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-green-800 mb-3">🔍 Результаты распознавания текста:</h3>
                
                {/* Общая статистика OCR */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-700 mb-4">
                  <div>
                    Страниц с текстом: {result.ocrResults.filter(ocr => ocr.text.length > 0).length}
                  </div>
                  <div>
                    Всего слов: {result.ocrResults.reduce((sum, ocr) => sum + ocr.wordsCount, 0)}
                  </div>
                  <div>
                    Всего символов: {result.ocrResults.reduce((sum, ocr) => sum + ocr.text.length, 0)}
                  </div>
                  <div>
                    Ошибок OCR: {result.ocrResults.filter(ocr => ocr.error).length}
                  </div>
                </div>

                {/* Текст выбранной страницы */}
                {result.ocrResults[selectedPage] && (
                  <div className="bg-white rounded border p-3">
                    <div className="text-sm text-gray-600 mb-2">
                      Текст страницы {selectedPage + 1}:
                      {result.ocrResults[selectedPage].wordsCount > 0 && (
                        <span className="ml-2 text-green-600">
                          ({result.ocrResults[selectedPage].wordsCount} слов)
                        </span>
                      )}
                      {result.ocrResults[selectedPage].error && (
                        <span className="ml-2 text-red-600">❌ Ошибка OCR</span>
                      )}
                    </div>
                    
                    {result.ocrResults[selectedPage].text ? (
                      <div className="max-h-32 overflow-y-auto">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                          {result.ocrResults[selectedPage].text}
                        </pre>
                      </div>
                    ) : result.ocrResults[selectedPage].error ? (
                      <div className="text-sm text-red-600">
                        Ошибка: {result.ocrResults[selectedPage].error}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        Текст не обнаружен на данной странице
                      </div>
                    )}
                  </div>
                )}

                {/* Полный текст всего документа */}
                <div className="mt-4 pt-4 border-t border-green-200">
                  <button
                    className="text-sm text-green-700 hover:text-green-800 font-medium"
                    onClick={() => {
                      const fullText = result.ocrResults!
                        .filter(ocr => ocr.text.length > 0)
                        .map(ocr => `=== Страница ${ocr.page} ===\n${ocr.text}`)
                        .join('\n\n');
                      
                      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `${result.filename.replace('.pdf', '')}_ocr_text.txt`;
                      link.click();
                    }}
                  >
                    📥 Скачать весь распознанный текст
                  </button>
                </div>
              </div>
            )}

            {/* Навигация по страницам */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  🖼️ Просмотр изображений:
                </h3>
                <button
                  onClick={downloadAllImages}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  📦 Скачать все ({result.pageCount} шт.)
                </button>
              </div>
              
              {/* Миниатюры страниц */}
              <div className="flex flex-wrap gap-2 mb-4">
                {result.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPage(index)}
                    className={`relative group ${
                      selectedPage === index
                        ? 'ring-2 ring-purple-500'
                        : 'hover:ring-2 hover:ring-gray-300'
                    } rounded overflow-hidden transition-all`}
                  >
                    <img 
                      src={`data:image/png;base64,${img.base64}`}
                      alt={`Page ${img.page}`}
                      className="w-16 h-20 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5">
                      {img.page}
                    </div>
                    {selectedPage === index && (
                      <div className="absolute inset-0 bg-purple-500 bg-opacity-20"></div>
                    )}
                  </button>
                ))}
              </div>

              {/* Большое изображение */}
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2 flex justify-between">
                  <span>
                    Страница {selectedPage + 1} из {result.images.length}
                  </span>
                  <span>
                    {result.images[selectedPage].width}×{result.images[selectedPage].height} px, 
                    {result.images[selectedPage].size_kb} KB
                  </span>
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-100 flex justify-center">
                  <img 
                    src={`data:image/png;base64,${result.images[selectedPage].base64}`}
                    alt={`Page ${selectedPage + 1}`}
                    className="max-w-full max-h-96 object-contain"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => downloadImage(
                    result.images[selectedPage].base64,
                    `${result.filename.replace('.pdf', '')}_page_${result.images[selectedPage].page}.png`
                  )}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  📥 Скачать страницу {selectedPage + 1}
                </button>

                <button
                  onClick={() => setSelectedPage(Math.max(0, selectedPage - 1))}
                  disabled={selectedPage === 0}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  ← Предыдущая
                </button>

                <button
                  onClick={() => setSelectedPage(Math.min(result.images.length - 1, selectedPage + 1))}
                  disabled={selectedPage === result.images.length - 1}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Следующая →
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                🔄 Новая конвертация
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-purple-50 rounded-md">
          <h4 className="text-sm font-medium text-purple-800 mb-2">⭐ О PDF конвертере с OCR:</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• 🖼️ <strong>PyMuPDF:</strong> Профессиональная конвертация PDF в PNG</li>
            <li>• 🔍 <strong>Google Vision OCR:</strong> Точное распознавание русского и английского текста</li>
            <li>• ⚙️ <strong>Настраиваемое качество:</strong> DPI от 150 до 600</li>
            <li>• 📄 <strong>Многостраничность:</strong> Обработка всех страниц документа</li>
            <li>• 💾 <strong>Экспорт результатов:</strong> Скачивание изображений и распознанного текста</li>
            <li>• 🚀 <strong>Высокая скорость:</strong> Параллельная обработка страниц</li>
          </ul>
        </div>
      </div>
    </div>
  );
}