'use client';

import { useState, useEffect } from 'react';
import { Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryBySupplierName } from '@/services/suppliers';
import { expenseCategoryMap } from '@/types/supplier';

interface InvoiceEditProps {
  invoice: any;
  onSave: (updatedInvoice: any) => void;
  onCancel: () => void;
}

export default function InvoiceEdit({ invoice, onSave, onCancel }: InvoiceEditProps) {
  const [formData, setFormData] = useState({
    invoice_number: invoice.invoice_number || '',
    supplier_name: invoice.supplier_name || '',
    issue_date: invoice.issue_date || '',
    total_amount: invoice.total_amount || 0,
    category: invoice.category || 'Профили',
    description: invoice.description || ''
  });

  const [isLoading, setIsLoading] = useState(false);

  // Автоматически обновляем категорию при изменении поставщика
  useEffect(() => {
    if (formData.supplier_name) {
      console.log('🔍 [InvoiceEdit] Определяем категорию для поставщика:', formData.supplier_name, 'ИНН:', invoice.supplier_inn);
      getCategoryBySupplierName(formData.supplier_name, invoice.supplier_inn).then(category => {
        if (category) {
          const categoryInRussian = expenseCategoryMap[category];
          console.log('✅ [InvoiceEdit] Найдена категория из БД:', category, '→', categoryInRussian);
          setFormData(prev => ({ ...prev, category: categoryInRussian }));
        } else {
          console.log('❌ [InvoiceEdit] Категория не найдена для поставщика:', formData.supplier_name);
        }
      });
    }
  }, [formData.supplier_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Обновляем счет в базе данных
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления счета');
      }

      const updatedInvoice = await response.json();
      onSave(updatedInvoice);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении изменений');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Редактировать счет</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Номер счета
            </label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => handleChange('invoice_number', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Поставщик
            </label>
            <input
              type="text"
              value={formData.supplier_name}
              onChange={(e) => handleChange('supplier_name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата счета
            </label>
            <input
              type="date"
              value={formData.issue_date}
              onChange={(e) => handleChange('issue_date', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сумма (₽)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => handleChange('total_amount', parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Материалы">Материалы</option>
              <option value="Комплектующие">Комплектующие</option>
              <option value="Услуги">Услуги</option>
              <option value="Оборудование">Оборудование</option>
              <option value="Подъемное оборудование">Подъемное оборудование</option>
              <option value="Профили">Профили</option>
              <option value="Дерево">Дерево</option>
              <option value="Сантехника">Сантехника</option>
              <option value="Электрика">Электрика</option>
              <option value="Фурнитура">Фурнитура</option>
              <option value="Транспорт">Транспорт</option>
              <option value="Прочее">Прочее</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <span className="mr-2">Сохранение...</span>
                </>
              ) : (
                <>
                  <Check size={16} className="mr-2" />
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