import { useState } from 'react';

interface OCRResponse {
  success: boolean;
  text?: string;
  error?: string;
  suggestions?: string[];
  metadata?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    charactersCount: number;
    wordsCount: number;
    confidence: number;
    processingTime: number;
    documentType: string;
    documentInfo: any;
  };
}

export default function PDFOCRTest() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/pdf-ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Ошибка сети',
        suggestions: ['Проверьте подключение к интернету', 'Попробуйте еще раз']
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Тест PDF OCR</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
            onChange={handleFileChange}
            className="mb-4"
          />
          
          {file && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <p><strong>Файл:</strong> {file.name}</p>
              <p><strong>Размер:</strong> {Math.round(file.size / 1024)} KB</p>
              <p><strong>Тип:</strong> {file.type}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={!file || loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded font-medium"
          >
            {loading ? 'Обработка...' : 'Распознать текст'}
          </button>
        </div>
      </form>

      {result && (
        <div className="space-y-6">
          {result.success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Успешно обработано</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Символов:</strong> {result.metadata?.charactersCount}</div>
                  <div><strong>Слов:</strong> {result.metadata?.wordsCount}</div>
                  <div><strong>Уверенность:</strong> {result.metadata?.confidence}%</div>
                  <div><strong>Время:</strong> {result.metadata?.processingTime}мс</div>
                  <div><strong>Тип документа:</strong> {result.metadata?.documentType}</div>
                  <div><strong>Размер файла:</strong> {result.metadata?.fileSize} KB</div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-2">📝 Распознанный текст:</h3>
                <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
                  {result.text}
                </div>
              </div>

              {result.metadata?.documentInfo && Object.keys(result.metadata.documentInfo).length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">📊 Извлеченная информация:</h3>
                  <pre className="text-sm">{JSON.stringify(result.metadata.documentInfo, null, 2)}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Ошибка</h3>
              <p className="text-red-700 mb-3">{result.error}</p>
              {result.suggestions && (
                <div>
                  <strong className="text-red-800">Рекомендации:</strong>
                  <ul className="list-disc list-inside mt-1 text-red-700">
                    {result.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}