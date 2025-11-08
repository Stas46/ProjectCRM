'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import AppLayout from '@/components/app-layout';
import { supabase } from '@/lib/supabase';

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

export default function NewInvoicePage() {
  const { id: projectId } = useParams() as { id: string };
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    issue_date: new Date().toISOString().split('T')[0], // Сегодняшняя дата по умолчанию
    due_date: '',
    supplier: '',
    notes: '',
    status: 'draft' // По умолчанию "Черновик"
  });
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, Record<string, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
  
  const handleItemChange = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setInvoiceItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    
    // Очистка ошибок при изменении поля
    if (itemErrors[id]?.[field]) {
      setItemErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors[id]) {
          delete newErrors[id][field as string];
          if (Object.keys(newErrors[id]).length === 0) {
            delete newErrors[id];
          }
        }
        return newErrors;
      });
    }
  };
  
  const addInvoiceItem = () => {
    setInvoiceItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
    ]);
  };
  
  const removeInvoiceItem = (id: string) => {
    setInvoiceItems(prev => prev.filter(item => item.id !== id));
    
    // Удаление ошибок для удаленного элемента
    if (itemErrors[id]) {
      setItemErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };
  
  const calculateTotal = () => {
    return invoiceItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const newItemErrors: Record<string, Record<string, string>> = {};
    
    // Валидация основных полей счета
    if (!formData.invoice_number.trim()) {
      newErrors.invoice_number = 'Необходимо указать номер счета';
    }
    
    if (!formData.issue_date) {
      newErrors.issue_date = 'Необходимо указать дату выставления счета';
    }
    
    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Необходимо указать поставщика';
    }
    
    // Валидация элементов счета
    invoiceItems.forEach(item => {
      const itemError: Record<string, string> = {};
      
      if (!item.description.trim()) {
        itemError.description = 'Необходимо указать описание';
      }
      
      if (item.quantity <= 0) {
        itemError.quantity = 'Количество должно быть больше 0';
      }
      
      if (item.unit_price < 0) {
        itemError.unit_price = 'Цена не может быть отрицательной';
      }
      
      if (Object.keys(itemError).length > 0) {
        newItemErrors[item.id] = itemError;
      }
    });
    
    setErrors(newErrors);
    setItemErrors(newItemErrors);
    
    return Object.keys(newErrors).length === 0 && Object.keys(newItemErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Преобразование данных для сохранения
      const invoiceData = {
        project_id: projectId,
        invoice_number: formData.invoice_number,
        issue_date: formData.issue_date,
        due_date: formData.due_date || null,
        supplier: formData.supplier,
        notes: formData.notes || null,
        status: formData.status,
        total_amount: calculateTotal()
      };
      
      console.log('Отправляем данные счета:', JSON.stringify(invoiceData, null, 2));
      
      // Сохранение счета в базу данных
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select();
      
      if (invoiceError) {
        console.error('Ошибка при сохранении счета:', JSON.stringify(invoiceError, null, 2));
        setSubmitError(`Ошибка при сохранении счета: ${invoiceError.message || 'Неизвестная ошибка'}`);
        return;
      }
      
      if (!invoiceResult || invoiceResult.length === 0) {
        setSubmitError('Не удалось получить ID созданного счета');
        return;
      }
      
      const invoiceId = invoiceResult[0].id;
      
      // Сохранение элементов счета
      const invoiceItemsData = invoiceItems.map(item => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItemsData);
      
      if (itemsError) {
        console.error('Ошибка при сохранении элементов счета:', JSON.stringify(itemsError, null, 2));
        setSubmitError(`Ошибка при сохранении элементов счета: ${itemsError.message || 'Неизвестная ошибка'}`);
        return;
      }
      
      console.log('Счет успешно создан');
      
      // Перенаправление обратно на страницу проекта
      router.push(`/projects/${projectId}`);
      
    } catch (err: any) {
      console.error('Ошибка при сохранении:', err);
      setSubmitError(`Произошла ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href={`/projects/${projectId}`} className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Новый счет</h1>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация о счете */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-1">
                Номер счета*
              </label>
              <input
                type="text"
                id="invoice_number"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.invoice_number ? 'border-red-300' : ''
                }`}
                placeholder="Введите номер счета"
              />
              {errors.invoice_number && <p className="mt-1 text-sm text-red-600">{errors.invoice_number}</p>}
            </div>
            
            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                Поставщик*
              </label>
              <input
                type="text"
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.supplier ? 'border-red-300' : ''
                }`}
                placeholder="Введите название поставщика"
              />
              {errors.supplier && <p className="mt-1 text-sm text-red-600">{errors.supplier}</p>}
            </div>
            
            <div>
              <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
                Дата выставления*
              </label>
              <input
                type="date"
                id="issue_date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleChange}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.issue_date ? 'border-red-300' : ''
                }`}
              />
              {errors.issue_date && <p className="mt-1 text-sm text-red-600">{errors.issue_date}</p>}
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Статус счета*
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="draft">Черновик</option>
                <option value="pending">Ожидает оплаты</option>
                <option value="paid">Оплачен</option>
                <option value="cancelled">Отменен</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Примечания
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Дополнительная информация по счету"
              />
            </div>
          </div>
        </div>
        
        {/* Элементы счета */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Позиции счета</h2>
            <button
              type="button"
              onClick={addInvoiceItem}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
            >
              <Plus size={16} className="mr-1" />
              Добавить позицию
            </button>
          </div>
          
          <div className="space-y-4">
            {invoiceItems.map((item, index) => (
              <div key={item.id} className="p-4 border border-gray-200 rounded-md">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm font-medium">Позиция #{index + 1}</h3>
                  {invoiceItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInvoiceItem(item.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label htmlFor={`item-desc-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Описание*
                    </label>
                    <input
                      type="text"
                      id={`item-desc-${item.id}`}
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        itemErrors[item.id]?.description ? 'border-red-300' : ''
                      }`}
                      placeholder="Введите описание товара или услуги"
                    />
                    {itemErrors[item.id]?.description && (
                      <p className="mt-1 text-sm text-red-600">{itemErrors[item.id].description}</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label htmlFor={`item-qty-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Количество*
                    </label>
                    <input
                      type="number"
                      id={`item-qty-${item.id}`}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      min="1"
                      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        itemErrors[item.id]?.quantity ? 'border-red-300' : ''
                      }`}
                    />
                    {itemErrors[item.id]?.quantity && (
                      <p className="mt-1 text-sm text-red-600">{itemErrors[item.id].quantity}</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label htmlFor={`item-price-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Цена за ед.*
                    </label>
                    <input
                      type="number"
                      id={`item-price-${item.id}`}
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        itemErrors[item.id]?.unit_price ? 'border-red-300' : ''
                      }`}
                    />
                    {itemErrors[item.id]?.unit_price && (
                      <p className="mt-1 text-sm text-red-600">{itemErrors[item.id].unit_price}</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сумма
                    </label>
                    <div className="h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-right">
                      {(item.quantity * item.unit_price).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs">
              <div className="flex justify-between py-2 text-sm">
                <span className="font-medium">Итого:</span>
                <span className="font-bold">{calculateTotal().toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Отмена
          </Link>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:ring-4 focus:ring-blue-300 ${
              isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Сохранить счет
              </>
            )}
          </button>
        </div>
        
        {submitError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}
      </form>
    </AppLayout>
  );
}