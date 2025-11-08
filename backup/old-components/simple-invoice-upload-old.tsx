'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileQueueItem {
  id: string;
  file: File;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  error?: string;
  result?: any;
}

interface SimpleInvoiceUploadProps {
  projectId: string;
  onInvoiceAdded: (invoice: any) => void;
  onClose: () => void;
}

export default function SimpleInvoiceUpload({ projectId, onInvoiceAdded, onClose }: SimpleInvoiceUploadProps) {
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFilesToQueue = (files: File[]) => {
    const newItems: FileQueueItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'waiting'
    }));
    
    setFileQueue(prev => [...prev, ...newItems]);
    
    // Если не обрабатываем, начинаем обработку
    if (!isProcessing) {
      processQueue([...fileQueue, ...newItems]);
    }
  };

  const processQueue = async (queue: FileQueueItem[]) => {
    setIsProcessing(true);
    
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status !== 'waiting') continue;
      
      // Обновляем статус на "обрабатывается"
      setFileQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'processing' } : q
      ));
      
      try {
        const result = await processFile(item.file);
        
        // Обновляем статус на "завершено"
        setFileQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, status: 'completed', result } : q
        ));
        
        // Добавляем счет в список
        onInvoiceAdded(result);
        
      } catch (error) {
        // Обновляем статус на "ошибка"
        setFileQueue(prev => prev.map(q => 
          q.id === item.id ? { 
            ...q, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Неизвестная ошибка'
          } : q
        ));
      }
    }
    
    setIsProcessing(false);
  };

  const processFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);

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

    // Получаем данные из правильной структуры
    const invoiceData = result.data || result;
    const invoice = invoiceData.invoice || {};
    const contractor = invoiceData.contractor || {};

    // Создаем новый счет с распознанными данными
    const newInvoice = {
      id: crypto.randomUUID(),
      invoice_number: invoice.number || 'НЕТ_НОМЕРА',
      issue_date: invoice.date || new Date().toISOString().split('T')[0],
      due_date: invoice.due_date || '',
      supplier: contractor.name || 'НЕТ_ПОСТАВЩИКА',
      supplier_inn: contractor.inn || '',
      total_amount: invoice.total_amount || 0,
      vat_amount: invoice.vat_amount || 0,
      vat_rate: invoice.vat_rate || 20,
      has_vat: invoice.has_vat || false,
      status: 'draft' as const,
      original_file_name: file.name,
    };

    return newInvoice;
  };

  const removeFileFromQueue = (id: string) => {
    setFileQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearCompletedFiles = () => {
    setFileQueue(prev => prev.filter(item => item.status !== 'completed'));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFilesToQueue(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFilesToQueue(Array.from(files));
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-900">Загрузить счет</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-900">Загрузить счета</h3>
        <div className="flex items-center gap-2">
          {fileQueue.filter(f => f.status === 'completed').length > 0 && (
            <Button
              onClick={clearCompletedFiles}
              size="sm"
              variant="outline"
            >
              Очистить завершенные
            </Button>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Очередь файлов */}
      {fileQueue.length > 0 && (
        <div className="mb-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Очередь обработки ({fileQueue.length})</h4>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {fileQueue.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  {item.status === 'waiting' && (
                    <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                  )}
                  {item.status === 'processing' && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  )}
                  {item.status === 'completed' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.status === 'waiting' && 'Ожидание...'}
                      {item.status === 'processing' && 'Обработка...'}
                      {item.status === 'completed' && 'Завершено'}
                      {item.status === 'error' && `Ошибка: ${item.error}`}
                    </p>
                  </div>
                </div>
                {item.status !== 'processing' && (
                  <button
                    onClick={() => removeFileFromQueue(item.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={(e) => e.preventDefault()}
      >
        <Upload className={`mx-auto h-8 w-8 mb-2 ${isDragOver ? 'text-blue-600' : 'text-gray-400'}`} />
        <p className={`text-sm mb-2 ${isDragOver ? 'text-blue-700' : 'text-gray-600'}`}>
          {isDragOver ? 'Отпустите файлы для загрузки' : 'Перетащите файлы сюда или нажмите для выбора'}
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Поддерживаются PDF, JPG, PNG, DOCX, XLSX. Можно выбрать несколько файлов.
        </p>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isProcessing ? 'Обработка...' : 'Выбрать файлы'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}