'use client';

import { useState, useEffect } from 'react';
import { Save, X, Eye, Calendar, Building2, FileText, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InvoiceData {
  id?: string;
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  supplier_name: string;
  supplier_inn?: string;
  total_amount: number;
  vat_amount?: number;
  vat_rate?: number;
  has_vat?: boolean;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  notes?: string;
  original_file_name?: string;
  original_file_url?: string;
}

interface InvoiceEditDialogProps {
  invoice: InvoiceData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: InvoiceData) => void;
  originalFile?: File | null;
}

export default function InvoiceEditDialog({ 
  invoice, 
  isOpen, 
  onClose, 
  onSave, 
  originalFile 
}: InvoiceEditDialogProps) {
  const [formData, setFormData] = useState<InvoiceData>({
    invoice_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    supplier_name: '',
    supplier_inn: '',
    total_amount: 0,
    vat_amount: 0,
    vat_rate: 20,
    has_vat: true,
    status: 'draft',
    notes: '',
    original_file_name: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (invoice) {
      setFormData({
        ...invoice,
        issue_date: invoice.issue_date || new Date().toISOString().split('T')[0],
        due_date: invoice.due_date || '',
        supplier_inn: invoice.supplier_inn || '',
        vat_amount: invoice.vat_amount || 0,
        vat_rate: invoice.vat_rate || 20,
        notes: invoice.notes || '',
        original_file_name: originalFile?.name || invoice.original_file_name || '',
      });
    }
  }, [invoice, originalFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    
    if (type === 'number') {
      processedValue = parseFloat(value) || 0;
    } else if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Очистка ошибки при изменении поля
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoice_number.trim()) {
      newErrors.invoice_number = 'Номер счета обязателен';
    }

    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = 'Поставщик обязателен';
    }

    if (!formData.issue_date) {
      newErrors.issue_date = 'Дата выставления обязательна';
    }

    if (formData.total_amount <= 0) {
      newErrors.total_amount = 'Сумма должна быть больше 0';
    }

    if (formData.has_vat && formData.vat_rate && (formData.vat_rate < 0 || formData.vat_rate > 100)) {
      newErrors.vat_rate = 'Ставка НДС должна быть от 0 до 100';
    }

    if (formData.due_date && formData.issue_date && new Date(formData.due_date) < new Date(formData.issue_date)) {
      newErrors.due_date = 'Срок оплаты не может быть раньше даты выставления';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения счета:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewOriginal = () => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile);
      window.open(url, '_blank');
    } else if (formData.original_file_url) {
      window.open(formData.original_file_url, '_blank');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {invoice?.id ? 'Редактировать счет' : 'Новый счет'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Основная информация */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText size={20} className="mr-2" />
              Основная информация
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Номер счета *
                </label>
                <input
                  type="text"
                  id="invoice_number"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.invoice_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="№ ИН-2025-001"
                />
                {errors.invoice_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoice_number}</p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Статус
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Черновик</option>
                  <option value="pending">Ожидает оплаты</option>
                  <option value="paid">Оплачен</option>
                  <option value="cancelled">Отменен</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Дата выставления *
                </label>
                <input
                  type="date"
                  id="issue_date"
                  name="issue_date"
                  value={formData.issue_date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.issue_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.issue_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.issue_date}</p>
                )}
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Срок оплаты
                </label>
                <input
                  type="date"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.due_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.due_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
                )}
              </div>
            </div>
          </div>

          {/* Поставщик */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Building2 size={20} className="mr-2" />
              Поставщик
            </h3>

            <div>
              <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700 mb-1">
                Название поставщика *
              </label>
              <input
                type="text"
                id="supplier_name"
                name="supplier_name"
                value={formData.supplier_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.supplier_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="ООО «Компания»"
              />
              {errors.supplier_name && (
                <p className="mt-1 text-sm text-red-600">{errors.supplier_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="supplier_inn" className="block text-sm font-medium text-gray-700 mb-1">
                ИНН поставщика
              </label>
              <input
                type="text"
                id="supplier_inn"
                name="supplier_inn"
                value={formData.supplier_inn}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1234567890"
              />
            </div>
          </div>

          {/* Финансовая информация */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DollarSign size={20} className="mr-2" />
              Финансовая информация
            </h3>

            <div>
              <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-1">
                Общая сумма *
              </label>
              <input
                type="number"
                id="total_amount"
                name="total_amount"
                value={formData.total_amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.total_amount ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.total_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.total_amount}</p>
              )}
              {formData.total_amount > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  {formatCurrency(formData.total_amount)}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="has_vat"
                name="has_vat"
                checked={formData.has_vat ?? false}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="has_vat" className="ml-2 block text-sm text-gray-900">
                Включает НДС
              </label>
            </div>

            {formData.has_vat && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vat_rate" className="block text-sm font-medium text-gray-700 mb-1">
                    Ставка НДС (%)
                  </label>
                  <input
                    type="number"
                    id="vat_rate"
                    name="vat_rate"
                    value={formData.vat_rate}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.vat_rate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.vat_rate && (
                    <p className="mt-1 text-sm text-red-600">{errors.vat_rate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="vat_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Сумма НДС
                  </label>
                  <input
                    type="number"
                    id="vat_amount"
                    name="vat_amount"
                    value={formData.vat_amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  {formData.vat_amount && formData.vat_amount > 0 && (
                    <p className="mt-1 text-sm text-gray-500">
                      {formatCurrency(formData.vat_amount)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Дополнительная информация */}
          <div className="space-y-4">
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Примечания
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Дополнительная информация о счете..."
              />
            </div>

            {(originalFile || formData.original_file_name) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Исходный файл
                </label>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
                  <span className="text-sm text-gray-700">
                    {originalFile?.name || formData.original_file_name}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleViewOriginal}
                  >
                    <Eye size={16} className="mr-1" />
                    Открыть
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}