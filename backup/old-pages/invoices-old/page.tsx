'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { FileText, Eye, Download, Search, Filter, Calendar, Building, CreditCard, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { expenseCategoryMap } from '@/types/supplier';
import { getCategoryColor, getCategoryBgColor } from '@/utils/category-colors';

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  supplier: string;
  supplier_inn: string;
  total_amount: number;
  category: string;
  original_file_name: string;
  project_id: string;
  created_at: string;
  project?: {
    id: string;
    name: string;
  };
}

export default function AllInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      console.log('🔄 [INVOICES-PAGE] Загрузка счетов через API...');
      
      const response = await fetch('/api/invoices');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 [INVOICES-PAGE] Получено данных:', data.length);
      console.log('🔍 [INVOICES-PAGE] Первый счет:', data[0]);
      
      if (data.length > 0) {
        console.log('🔍 [INVOICES-PAGE] Первый счет:', data[0]);
      }
      
      setInvoices(data || []);
    } catch (err: any) {
      console.error('❌ [INVOICES-PAGE] Ошибка загрузки счетов:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Вы уверены, что хотите удалить счет "${invoiceNumber}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      console.log('🗑️ [INVOICES-PAGE] Удаление счета:', invoiceId);
      
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка при удалении счета');
      }

      console.log('✅ [INVOICES-PAGE] Счет успешно удален');
      
      // Обновляем список счетов
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      
    } catch (error) {
      console.error('❌ [INVOICES-PAGE] Ошибка удаления:', error);
      alert('Произошла ошибка при удалении счета. Попробуйте еще раз.');
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedInvoices.size === 0) return;

    if (!confirm(`Вы уверены, что хотите удалить ${selectedInvoices.size} счет(ов)? Это действие нельзя отменить.`)) {
      return;
    }

    setIsDeleting(true);
    let deletedCount = 0;
    let errorCount = 0;

    try {
      console.log(`🗑️ [INVOICES-PAGE] Массовое удаление ${selectedInvoices.size} счетов`);

      for (const invoiceId of selectedInvoices) {
        try {
          const response = await fetch(`/api/invoices/${invoiceId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            deletedCount++;
            console.log(`✅ [INVOICES-PAGE] Счет ${invoiceId} удален`);
          } else {
            errorCount++;
            console.error(`❌ [INVOICES-PAGE] Ошибка удаления счета ${invoiceId}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ [INVOICES-PAGE] Исключение при удалении счета ${invoiceId}:`, error);
        }
      }

      // Обновляем список счетов
      setInvoices(prev => prev.filter(inv => !selectedInvoices.has(inv.id)));
      setSelectedInvoices(new Set());

      if (errorCount > 0) {
        alert(`Удалено: ${deletedCount}, ошибок: ${errorCount}`);
      } else {
        console.log(`✅ [INVOICES-PAGE] Все счета успешно удалены: ${deletedCount}`);
      }
      
    } catch (error) {
      console.error('❌ [INVOICES-PAGE] Ошибка массового удаления:', error);
      alert('Произошла ошибка при удалении счетов. Попробуйте еще раз.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      (invoice.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.supplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !categoryFilter || invoice.category === categoryFilter;

    // Фильтр по датам счета
    const invoiceDate = new Date(invoice.issue_date);
    const matchesDateFrom = !dateFrom || invoiceDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || invoiceDate <= new Date(dateTo);

    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
  });

  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
  const categoriesStats = filteredInvoices.reduce((acc, invoice) => {
    const category = invoice.category || 'additional';
    if (!acc[category]) {
      acc[category] = { count: 0, amount: 0 };
    }
    acc[category].count++;
    acc[category].amount += invoice.total_amount || 0;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка счетов...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-red-800 font-medium">Ошибка загрузки</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Заголовок */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Все загруженные счета</h1>
            {selectedInvoices.size > 0 && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  Выбрано: {selectedInvoices.size}
                </span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Trash2 size={16} className="mr-2" />
                  {isDeleting ? 'Удаление...' : 'Удалить выбранные'}
                </button>
              </div>
            )}
          </div>
          <p className="text-gray-600">Просмотр и управление всеми счетами по проектам</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <FileText className="text-blue-600 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-600">Всего счетов</p>
                <p className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <CreditCard className="text-green-600 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-600">Общая сумма</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <Building className="text-purple-600 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-600">Категорий</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(categoriesStats).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Поиск по номеру счета, поставщику, проекту..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="sm:w-64">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Все категории</option>
                  {Object.entries(expenseCategoryMap).map(([key, label]) => (
                    <option key={key} value={label}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Фильтр по датам */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="text-gray-400" size={20} />
                <span className="text-sm text-gray-600">Дата счета:</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="От"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="До"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Сбросить
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Статистика по категориям */}
        {Object.keys(categoriesStats).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Статистика по категориям</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(categoriesStats).map(([category, stats]) => (
                <div 
                  key={category} 
                  className="rounded-lg px-3 py-2 border-l-4 flex-shrink-0"
                  style={{
                    backgroundColor: getCategoryBgColor(category),
                    borderLeftColor: getCategoryColor(category)
                  }}
                >
                  <span className="font-medium text-sm" style={{ color: getCategoryColor(category) }}>
                    {category}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">
                    {stats.count} • {formatCurrency(stats.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Список счетов */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Счета не найдены</h3>
            <p className="text-gray-600">
              {invoices.length === 0 
                ? 'Загруженных счетов пока нет. Добавьте счета через раздел проектов.'
                : 'Попробуйте изменить параметры поиска или фильтры.'
              }
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      №
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Счет
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Поставщик
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Проект
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата счета
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Загружен
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice, index) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => handleSelectInvoice(invoice.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </p>
                          <p className="text-sm text-gray-500">
                            {invoice.original_file_name}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.supplier}
                          </p>
                          {invoice.supplier_inn && (
                            <p className="text-sm text-gray-500">
                              ИНН: {invoice.supplier_inn}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.project?.name || 'Не указан'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: getCategoryBgColor(invoice.category),
                            color: getCategoryColor(invoice.category)
                          }}
                        >
                          {invoice.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.issue_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => window.open(`/api/files/${invoice.original_file_name}`, '_blank')}
                            className="text-blue-600 hover:text-blue-900"
                            title="Просмотреть файл"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `/api/files/${invoice.original_file_name}`;
                              link.download = invoice.original_file_name;
                              link.click();
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Скачать файл"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number)}
                            className="text-red-600 hover:text-red-900"
                            title="Удалить счет"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}