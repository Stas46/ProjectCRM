import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Простой компонент Badge
const Badge = ({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "secondary" | "outline" }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'secondary' ? 'bg-gray-100 text-gray-800' : 
    variant === 'outline' ? 'border border-gray-300 text-gray-700' :
    'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
);
import { Upload, Brain, FileText, Users, Receipt, TrendingUp, Download, CheckCircle } from 'lucide-react';

interface ParsedInvoice {
  invoice: {
    number: string;
    date: string;
    due_date?: string;
    total_amount: number;
    vat_amount?: number;
    vat_rate?: number;
    has_vat: boolean;
  };
  contractor: {
    name: string;
    inn: string;
    kpp?: string;
    address?: string;
  };
  items: Array<{
    position: number;
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
}

interface SmartInvoiceResult {
  success: boolean;
  data: ParsedInvoice | null;
  ocr_text: string;
  file_info: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

export default function SmartInvoiceAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SmartInvoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dpi, setDpi] = useState<string>('300');

  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };
  
  const processInvoice = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dpi', dpi);
      
      const response = await fetch('/api/smart-invoice', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка анализа счета');
      }
      
      console.log('📊 Ответ API:', data);
      
      if (data.success) {
        console.log('✅ Данные успешно получены:', data.data);
        setResult(data);
      } else {
        console.error('❌ API вернул ошибку:', data.error);
        throw new Error(data.error || 'Ошибка анализа счета');
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при анализе счета');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const exportToJSON = () => {
    if (!result?.data) return;
    
    const dataStr = JSON.stringify(result.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `invoice_${result.data.invoice.number || 'unknown'}_${Date.now()}.json`;
    link.click();
  };
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Умный анализ счетов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Загрузка файла */}
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {file ? file.name : 'Выберите файл счета (PDF, Excel, Word)'}
              </p>
              <p className="text-sm text-gray-500">
                Поддерживаются PDF, Excel (.xlsx, .xls) и Word (.docx, .doc) файлы. Максимум 10 МБ
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.docx,.doc"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            {/* Настройки */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Качество (DPI):</label>
                <select
                  value={dpi}
                  onChange={(e) => setDpi(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="150">150 (быстро)</option>
                  <option value="200">200 (хорошо)</option>
                  <option value="300">300 (отлично)</option>
                  <option value="400">400 (максимум)</option>
                </select>
              </div>
              
              <Button 
                onClick={processInvoice} 
                disabled={!file || isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Анализируем...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Анализировать счет
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Ошибка */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Результаты */}
      {result && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-700">
            🔍 Отладка: Получен результат, success: {result.success ? 'да' : 'нет'}, 
            данные: {result.data ? 'есть' : 'нет'}
          </p>
        </div>
      )}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Структурированные данные */}
          <div className="space-y-4">
            {result.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Извлеченные данные
                    <Button 
                      onClick={exportToJSON} 
                      variant="outline" 
                      size="sm"
                      className="ml-auto"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      JSON
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Счет */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold">Счет</h3>
                    </div>
                    <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600"><strong>Номер:</strong></span>
                        <span className={`font-mono ${result.data.invoice.number ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                          {result.data.invoice.number || 'Не указан'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600"><strong>Дата:</strong></span>
                        <span className={result.data.invoice.date ? 'text-gray-900' : 'text-gray-400'}>
                          {result.data.invoice.date || 'Не указана'}
                        </span>
                      </div>
                      {result.data.invoice.due_date && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600"><strong>Срок оплаты:</strong></span>
                          <span className="text-gray-900">{result.data.invoice.due_date}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600"><strong>Сумма:</strong></span>
                        <span className={`font-semibold ${result.data.invoice.total_amount ? 'text-green-600 text-lg' : 'text-gray-400'}`}>
                          {result.data.invoice.total_amount ? formatAmount(result.data.invoice.total_amount) : 'Не указана'}
                        </span>
                      </div>
                      {result.data.invoice.vat_amount && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600"><strong>НДС:</strong></span>
                          <span className="text-orange-600 font-semibold">
                            {formatAmount(result.data.invoice.vat_amount)}{result.data.invoice.vat_rate ? ` (${result.data.invoice.vat_rate}%)` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Контрагент */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold">Контрагент (Поставщик)</h3>
                    </div>
                    <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600 min-w-[60px]"><strong>Название:</strong></span>
                        <span className="text-gray-900">{result.data.contractor.name || 'Не указано'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600 min-w-[60px]"><strong>ИНН:</strong></span>
                        <span className={`font-mono ${result.data.contractor.inn ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                          {result.data.contractor.inn || 'Не указан'}
                        </span>
                      </div>
                      {result.data.contractor.kpp && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600 min-w-[60px]"><strong>КПП:</strong></span>
                          <span className="font-mono text-blue-600">{result.data.contractor.kpp}</span>
                        </div>
                      )}
                      {result.data.contractor.address && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600 min-w-[60px]"><strong>Адрес:</strong></span>
                          <span className="text-gray-900">{result.data.contractor.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Позиции */}
                  {result.data.items.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <h3 className="font-semibold">Позиции ({result.data.items.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {result.data.items.map((item: any, index: number) => (
                          <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-gray-600">
                              {item.quantity} {item.unit} × {formatAmount(item.price)} = {formatAmount(item.total)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Статистика */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  Статистика анализа
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Файл</div>
                    <div className="font-semibold">{result.file_info.name}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Размер</div>
                    <div className="font-semibold">{(result.file_info.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Тип</div>
                    <div className="font-semibold">{result.file_info.extension.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Статус</div>
                    <Badge variant={result.data ? "default" : "secondary"}>
                      {result.data ? "Обработан" : "Ошибка"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Извлеченный текст */}
          <div className="space-y-4">
            {result.ocr_text && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Извлеченный текст
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {result.ocr_text || 'Текст не извлечен'}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}