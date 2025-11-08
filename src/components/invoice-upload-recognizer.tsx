'use client';

import { useState, useRef } from 'react';
import { Upload, Eye, Download, Check, X, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecognizedInvoiceData {
  invoice: {
    number: string | null;
    date: string | null;
    due_date: string | null;
    total_amount: number | null;
    vat_amount: number | null;
    vat_rate: number | null;
    has_vat: boolean;
  };
  contractor: {
    name: string | null;
    inn: string | null;
    all_inns: string[] | null;
    kpp: string | null;
    address: string | null;
  };
  items: any[];
}

interface InvoiceUploadRecognizerProps {
  projectId: string;
  onInvoiceRecognized: (data: RecognizedInvoiceData & { originalFile: File }) => void;
  onClose: () => void;
}

export default function InvoiceUploadRecognizer({ projectId, onInvoiceRecognized, onClose }: InvoiceUploadRecognizerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [recognizedData, setRecognizedData] = useState<RecognizedInvoiceData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsUploading(true);
    setUploadedFile(file);

    // Создаем превью для изображений и PDF
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/smart-invoice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Ошибка сервера: ${errorData}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Безопасная инициализация данных с дефолтными значениями
      const safeResult = {
        invoice: {
          number: result.invoice?.number || null,
          date: result.invoice?.date || null,
          due_date: result.invoice?.due_date || null,
          total_amount: result.invoice?.total_amount || null,
          vat_amount: result.invoice?.vat_amount || null,
          vat_rate: result.invoice?.vat_rate || null,
          has_vat: result.invoice?.has_vat || false,
        },
        contractor: {
          name: result.contractor?.name || null,
          inn: result.contractor?.inn || null,
          all_inns: result.contractor?.all_inns || null,
          kpp: result.contractor?.kpp || null,
          address: result.contractor?.address || null,
        },
        items: result.items || [],
      };

      setRecognizedData(safeResult);
    } catch (err) {
      console.error('Ошибка распознавания:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка при распознавании счета');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleAccept = () => {
    if (recognizedData && uploadedFile) {
      onInvoiceRecognized({
        ...recognizedData,
        originalFile: uploadedFile
      });
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount || typeof amount !== 'number') return 'Не определено';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || typeof dateString !== 'string') return 'Не определено';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Загрузка и распознавание счета
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {!uploadedFile && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Перетащите файл сюда или нажмите для выбора
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Поддерживаются: PDF, JPG, PNG, DOCX, XLSX, TXT
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Выбрать файл
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.txt"
                onChange={handleFileInputChange}
              />
            </div>
          )}

          {isUploading && (
            <div className="text-center py-8">
              <Loader2 size={48} className="mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700">
                Распознаем счет...
              </p>
              <p className="text-sm text-gray-500">
                Это может занять несколько секунд
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <X size={20} className="text-red-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Ошибка распознавания
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {recognizedData && uploadedFile && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Превью файла */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Исходный файл
                </h3>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <FileText size={20} className="text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {uploadedFile.name}
                    </span>
                  </div>
                  
                  {previewUrl && uploadedFile.type.startsWith('image/') && (
                    <img
                      src={previewUrl}
                      alt="Превью счета"
                      className="w-full h-64 object-contain border border-gray-200 rounded"
                    />
                  )}
                  
                  {previewUrl && uploadedFile.type === 'application/pdf' && (
                    <div className="w-full h-64 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                      <FileText size={48} className="text-gray-400" />
                    </div>
                  )}
                  
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = URL.createObjectURL(uploadedFile);
                        window.open(url, '_blank');
                      }}
                    >
                      <Eye size={16} className="mr-2" />
                      Открыть
                    </Button>
                  </div>
                </div>
              </div>

              {/* Распознанные данные */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Распознанные данные
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Основная информация</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Номер счета:</span>
                        <span className="font-medium">
                          {recognizedData?.invoice?.number || 'Не определено'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Дата:</span>
                        <span className="font-medium">
                          {formatDate(recognizedData?.invoice?.date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Срок оплаты:</span>
                        <span className="font-medium">
                          {formatDate(recognizedData?.invoice?.due_date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Сумма:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(recognizedData?.invoice?.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Поставщик</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Название:</span>
                        <span className="font-medium">
                          {recognizedData?.contractor?.name || 'Не определено'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ИНН:</span>
                        <span className="font-medium">
                          {recognizedData?.contractor?.inn || 'Не определено'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {recognizedData?.invoice?.has_vat && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">НДС</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ставка НДС:</span>
                          <span className="font-medium">
                            {recognizedData?.invoice?.vat_rate ? `${recognizedData.invoice.vat_rate}%` : 'Не определено'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Сумма НДС:</span>
                          <span className="font-medium">
                            {formatCurrency(recognizedData?.invoice?.vat_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleAccept}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check size={16} className="mr-2" />
                    Принять и добавить в проект
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}