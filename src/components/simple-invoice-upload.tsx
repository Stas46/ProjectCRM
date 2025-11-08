'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { getCategoryBySupplierName } from '@/services/suppliers';
import { expenseCategoryMap } from '@/types/supplier';

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
  const processingRef = useRef(false); // Дополнительная защита от повторного запуска

  // Отладочная информация при изменении состояния
  useEffect(() => {
    console.log('📊 [Upload] Состояние изменилось:', {
      queueLength: fileQueue.length,
      isProcessing,
      statuses: fileQueue.map(f => ({ name: f.file.name, status: f.status }))
    });
  }, [fileQueue, isProcessing]);

  const addFilesToQueue = (files: File[]) => {
    console.log('📁 [Upload] Добавляем файлы в очередь:', files.map(f => f.name));
    
    const newItems: FileQueueItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'waiting'
    }));
    
    setFileQueue(prev => {
      const updated = [...prev, ...newItems];
      console.log('📁 [Upload] Обновленная очередь:', updated.length, 'файлов');
      return updated;
    });
    
    // Если не обрабатываем, начинаем обработку
    if (!isProcessing) {
      console.log('🔄 [Upload] Запускаем обработку очереди');
      // Используем setTimeout чтобы состояние успело обновиться
      setTimeout(() => processQueue(), 50);
    }
  };

  const processQueue = async () => {
    if (isProcessing || processingRef.current) {
      console.log('⚠️ [Upload] Обработка уже идет, пропускаем');
      return; // Предотвращаем одновременную обработку
    }
    
    console.log('🔄 [Upload] Начинаем обработку очереди');
    setIsProcessing(true);
    processingRef.current = true;
    
    try {
      let hasWaitingFiles = true;
      
      while (hasWaitingFiles) {
        // Получаем текущее состояние очереди
        const currentQueue = await new Promise<FileQueueItem[]>((resolve) => {
          setFileQueue(prev => {
            resolve(prev);
            return prev;
          });
        });
        
        console.log('📊 [Upload] Текущая очередь:', currentQueue.length, 'файлов');
        
        // Находим следующий файл для обработки
        const waitingItem = currentQueue.find(item => item.status === 'waiting');
        
        if (!waitingItem) {
          console.log('✅ [Upload] Нет файлов в ожидании, завершаем');
          hasWaitingFiles = false;
          break;
        }
        
        console.log('🔄 [Upload] Обрабатываем файл:', waitingItem.file.name);
        
        // Помечаем файл как обрабатываемый
        setFileQueue(prev => prev.map(q => 
          q.id === waitingItem.id ? { ...q, status: 'processing' } : q
        ));
        
        try {
          // Обрабатываем файл
          const result = await processFile(waitingItem.file);
          
          console.log('✅ [Upload] Файл обработан успешно:', waitingItem.file.name);
          
          // Обновляем статус на завершен
          setFileQueue(prev => prev.map(q => 
            q.id === waitingItem.id ? { ...q, status: 'completed', result } : q
          ));
          
          // Добавляем счет в список (отложенно, чтобы не сбросить состояние очереди)
          setTimeout(() => {
            console.log('📝 [Upload] Добавляем счет в список');
            onInvoiceAdded(result);
          }, 500); // Увеличили задержку
          
        } catch (error) {
          console.error('❌ [Upload] Ошибка обработки файла:', waitingItem.file.name, error);
          
          // Обновляем статус на ошибку
          setFileQueue(prev => prev.map(q => 
            q.id === waitingItem.id ? { 
              ...q, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            } : q
          ));
        }
        
        // Небольшая пауза между файлами
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } finally {
      console.log('🏁 [Upload] Обработка очереди завершена');
      setIsProcessing(false);
      processingRef.current = false;
    }
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
    const supplierName = contractor.name || 'НЕТ_ПОСТАВЩИКА';
    const supplierInn = contractor.inn || '';
    const category = await getCategoryBySupplierName(supplierName, supplierInn);
    const categoryName = expenseCategoryMap[category] || category;
    
    const newInvoice = {
      id: crypto.randomUUID(),
      invoice_number: invoice.number || 'НЕТ_НОМЕРА',
      issue_date: invoice.date || new Date().toISOString().split('T')[0],
      due_date: invoice.due_date || '',
      supplier: supplierName,
      supplier_inn: contractor.inn || '',
      total_amount: invoice.total_amount || 0,
      vat_amount: invoice.vat_amount || 0,
      vat_rate: invoice.vat_rate || 20,
      has_vat: invoice.has_vat || false,
      category: categoryName,
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
        <h3 className="text-lg font-medium text-gray-900">Загрузить счета</h3>
        <div className="flex items-center gap-2">
          {fileQueue.filter(f => f.status === 'completed').length > 0 && (
            <button
              onClick={clearCompletedFiles}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300"
            >
              Очистить завершенные
            </button>
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
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-700">
              Очередь обработки ({fileQueue.length})
            </h4>
            {fileQueue.some(item => item.status === 'completed') && (
              <button
                onClick={clearCompletedFiles}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Очистить завершенные
              </button>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {fileQueue.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  {item.status === 'waiting' && (
                    <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse"></div>
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
                    <p className="text-sm font-medium text-gray-900 truncate" title={item.file.name}>
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
                    title="Удалить из очереди"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Индикатор обработки */}
          {isProcessing && (
            <div className="text-center py-2">
              <div className="inline-flex items-center space-x-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Обработка файлов...</span>
              </div>
            </div>
          )}
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
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed mr-2"
        >
          {isProcessing ? 'Обработка...' : 'Выбрать файлы'}
        </button>
        <button
          onClick={onClose}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
        >
          Закрыть
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Статистика обработки */}
      {fileQueue.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Статистика:</span>
            {' '}
            Всего: {fileQueue.length}
            {', '}
            Ожидают: {fileQueue.filter(f => f.status === 'waiting').length}
            {', '}
            Обрабатываются: {fileQueue.filter(f => f.status === 'processing').length}
            {', '}
            Завершено: {fileQueue.filter(f => f.status === 'completed').length}
            {fileQueue.filter(f => f.status === 'error').length > 0 && (
              <>
                {', '}
                <span className="text-red-600">Ошибки: {fileQueue.filter(f => f.status === 'error').length}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}