'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Home, FileText, Trash2, Link as LinkIcon, X, Edit, Save, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { expenseCategoryMap, SupplierCategory } from '@/types/supplier';

// Информация о возможном дубликате
interface DuplicateInfo {
  invoice_id: string;  // ID нового загруженного счёта
  duplicates: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    total_amount: number;
    supplier_name: string;
    file_url: string;
    matches: string[];
  }[];
}

interface Invoice {
  id: string;
  supplier_id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number | null;
  vat_amount: number | null;
  file_url: string | null;
  created_at: string;
  sequence_number?: number;
  project_id?: string | null;
  suppliers?: {
    name: string;
    inn: string;
    category: string;
  };
}

interface Project {
  id: string;
  title: string;
  client: string;
}

interface Supplier {
  id: string;
  name: string;
  inn: string;
  category: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editData, setEditData] = useState({
    invoice_number: '',
    invoice_date: '',
    total_amount: '',
    vat_amount: '',
    supplier_id: '',
  });

  // Информация о дубликатах (ключ = ID нового счёта)
  const [duplicateWarnings, setDuplicateWarnings] = useState<Map<string, DuplicateInfo>>(new Map());

  // Фильтры
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Поиск
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInvoices();
    loadSuppliers();
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, client')
        .order('title');

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Ошибка загрузки проектов:', err);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, inn, category')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Ошибка загрузки поставщиков:', err);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          suppliers (
            name,
            inn,
            category
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📋 Загружено счетов:', data?.length);
      setInvoices(data || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const totalFiles = files.length;
      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;
      const newDuplicates = new Map<string, DuplicateInfo>();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          setUploadProgress(`Обработка ${i + 1} из ${totalFiles}: ${file.name}...`);

          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/smart-invoice', {
            method: 'POST',
            body: formData,
          });

          const responseData = await response.json();

          if (!response.ok) {
            throw new Error(responseData.error || 'Ошибка загрузки');
          }

          successCount++;
          
          // Проверяем на возможный дубликат (счёт создан, но есть похожие)
          if (responseData.is_possible_duplicate && responseData.possible_duplicates?.length > 0 && responseData.invoice?.id) {
            duplicateCount++;
            newDuplicates.set(responseData.invoice.id, {
              invoice_id: responseData.invoice.id,
              duplicates: responseData.possible_duplicates,
            });
          }
        } catch (err) {
          console.error(`Ошибка файла ${file.name}:`, err);
          errorCount++;
        }
      }

      let statusMessage = `✅ Загружено: ${successCount}`;
      if (duplicateCount > 0) statusMessage += `, ⚠️ дубликатов: ${duplicateCount}`;
      if (errorCount > 0) statusMessage += `, ошибок: ${errorCount}`;
      
      if (successCount > 0) {
        setUploadProgress(statusMessage);
        await loadInvoices();
        
        // Сохраняем информацию о дубликатах для показа в таблице
        if (newDuplicates.size > 0) {
          setDuplicateWarnings(prev => {
            const updated = new Map(prev);
            newDuplicates.forEach((value, key) => updated.set(key, value));
            return updated;
          });
        }
      } else {
        setUploadProgress(`⚠️ Все файлы завершились с ошибкой`);
      }

      setTimeout(() => setUploadProgress(''), 5000);
    } catch (err) {
      console.error('Ошибка:', err);
      setUploadProgress('❌ Ошибка загрузки');
      setTimeout(() => setUploadProgress(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  // Действия с дубликатами
  const handleDuplicateAction = async (invoiceId: string, action: 'delete' | 'update' | 'keep') => {
    const duplicateInfo = duplicateWarnings.get(invoiceId);
    if (!duplicateInfo) return;
    
    const { supabase } = await import('@/lib/supabase');
    
    try {
      if (action === 'delete') {
        // Удалить новый счёт (текущий)
        const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
        if (error) throw error;
        console.log(`🗑️ Удалён новый счёт ${invoiceId}`);
      } else if (action === 'update') {
        // Удалить все старые дубликаты
        for (const dup of duplicateInfo.duplicates) {
          const { error } = await supabase.from('invoices').delete().eq('id', dup.id);
          if (error) throw error;
          console.log(`🗑️ Удалён старый дубликат ${dup.id}`);
        }
      }
      // action === 'keep' — ничего не делаем, просто убираем предупреждение
      
      // Убираем предупреждение о дубликате
      setDuplicateWarnings(prev => {
        const updated = new Map(prev);
        updated.delete(invoiceId);
        return updated;
      });
      
      // Перезагружаем список счетов
      await loadInvoices();
    } catch (err) {
      console.error('Ошибка при обработке дубликата:', err);
      alert('Ошибка при обработке дубликата');
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelection = new Set(selectedInvoices);
    if (newSelection.has(invoiceId)) {
      newSelection.delete(invoiceId);
    } else {
      newSelection.add(invoiceId);
    }
    setSelectedInvoices(newSelection);
  };

  const toggleAllInvoices = () => {
    const filteredIds = new Set(filteredInvoices.map(inv => inv.id));
    const allFilteredSelected = filteredInvoices.every(inv => selectedInvoices.has(inv.id));
    
    if (allFilteredSelected) {
      // Убираем выделение только с отфильтрованных счетов
      const newSelection = new Set(selectedInvoices);
      filteredIds.forEach(id => newSelection.delete(id));
      setSelectedInvoices(newSelection);
    } else {
      // Добавляем к выделению все отфильтрованные счета
      const newSelection = new Set(selectedInvoices);
      filteredIds.forEach(id => newSelection.add(id));
      setSelectedInvoices(newSelection);
    }
  };

  const deleteSelectedInvoices = async () => {
    if (selectedInvoices.size === 0) return;
    if (!confirm(`Удалить выбранные счета (${selectedInvoices.size} шт.)? Это действие необратимо.`)) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');

      const { error } = await supabase
        .from('invoices')
        .delete()
        .in('id', Array.from(selectedInvoices));

      if (error) throw error;

      await loadInvoices();
      setSelectedInvoices(new Set());
    } catch (err) {
      console.error('Ошибка удаления счетов:', err);
      alert('Ошибка при удалении счетов');
    }
  };

  const openProjectSelector = async () => {
    setShowProjectSelect(true);
  };

  const linkToProject = async (projectId: string) => {
    if (selectedInvoices.size === 0) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');

      const { error } = await supabase
        .from('invoices')
        .update({ project_id: projectId })
        .in('id', Array.from(selectedInvoices));

      if (error) throw error;

      await loadInvoices();
      setSelectedInvoices(new Set());
      setShowProjectSelect(false);
      setProjectSearchQuery('');
    } catch (err) {
      console.error('Ошибка привязки к проекту:', err);
      alert('Ошибка при привязке к проекту');
    }
  };

  const openEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditData({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      total_amount: invoice.total_amount?.toString() || '',
      vat_amount: invoice.vat_amount?.toString() || '',
      supplier_id: invoice.supplier_id || '',
    });
  };

  const saveInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    try {
      const { supabase } = await import('@/lib/supabase');

      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_number: editData.invoice_number,
          invoice_date: editData.invoice_date,
          total_amount: parseFloat(editData.total_amount) || null,
          vat_amount: editData.vat_amount ? parseFloat(editData.vat_amount) : null,
          supplier_id: editData.supplier_id || null,
        })
        .eq('id', editingInvoice.id);

      if (error) throw error;

      await loadInvoices();
      setEditingInvoice(null);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert('Ошибка при сохранении изменений');
    }
  };

  // Функция фильтрации счетов
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Поиск
    if (searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(inv => {
        const number = inv.invoice_number?.toLowerCase() || '';
        const supplierName = inv.suppliers?.name?.toLowerCase() || '';
        const supplierInn = inv.suppliers?.inn?.toLowerCase() || '';
        const total = inv.total_amount ? inv.total_amount.toString() : '';
        const vat = inv.vat_amount ? inv.vat_amount.toString() : '';
        return (
          number.includes(query) ||
          supplierName.includes(query) ||
          supplierInn.includes(query) ||
          total.includes(query) ||
          vat.includes(query)
        );
      });
    }

    // Фильтр по проекту
    if (filterProject !== 'all') {
      if (filterProject === 'unlinked') {
        filtered = filtered.filter(inv => !inv.project_id);
      } else {
        filtered = filtered.filter(inv => inv.project_id === filterProject);
      }
    }

    // Фильтр по поставщику
    if (filterSupplier !== 'all') {
      filtered = filtered.filter(inv => inv.supplier_id === filterSupplier);
    }

    // Фильтр по периоду
    if (filterPeriod !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(inv => {
        const invoiceDate = new Date(inv.invoice_date);
        
        switch (filterPeriod) {
          case 'today':
            return invoiceDate >= startOfToday;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return invoiceDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return invoiceDate >= monthAgo;
          case 'quarter':
            const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            return invoiceDate >= quarterAgo;
          case 'year':
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            return invoiceDate >= yearAgo;
          case 'custom':
            if (customStartDate && customEndDate) {
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              end.setHours(23, 59, 59, 999);
              return invoiceDate >= start && invoiceDate <= end;
            }
            return true;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [invoices, searchQuery, filterProject, filterSupplier, filterPeriod, customStartDate, customEndDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white shadow-sm border-b">
        {/* Мобильный хедер */}
        <div className="md:hidden">
          <div className="px-3 py-2">
            {/* Строка 1: Навигация + Заголовок + Загрузка */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <a href="/" className="text-gray-600 hover:text-gray-900">
                  <Home className="w-5 h-5" />
                </a>
                <h1 className="text-base font-bold text-gray-900">Счета</h1>
                <span className="text-xs text-gray-500">
                  ({filteredInvoices.length})
                </span>
              </div>
              <label className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm">
                <Upload className="w-4 h-4" />
                {uploading ? '...' : 'Загрузить'}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* Строка 2: Действия с выбранными (только если есть выбранные) */}
            {selectedInvoices.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={openProjectSelector}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-blue-600 bg-blue-50 rounded border border-blue-200"
                >
                  <LinkIcon className="w-3 h-3" />
                  Привязать ({selectedInvoices.size})
                </button>
                <button
                  onClick={deleteSelectedInvoices}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-red-600 bg-red-50 rounded border border-red-200"
                >
                  <Trash2 className="w-3 h-3" />
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Десктопный хедер */}
        <div className="hidden md:block">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                <Home className="w-5 h-5" />
              </a>
              <FileText className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Счета</h1>
              <span className="text-sm text-gray-500">
                ({filteredInvoices.length}{filteredInvoices.length !== invoices.length ? ` из ${invoices.length}` : ''})
              </span>
              {selectedInvoices.size > 0 && (
                <span className="text-sm text-blue-600 font-medium">
                  Выбрано: {selectedInvoices.size}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedInvoices.size > 0 && (
                <>
                  <button
                    onClick={openProjectSelector}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Привязать к проекту
                  </button>
                  <button
                    onClick={deleteSelectedInvoices}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить ({selectedInvoices.size})
                  </button>
                </>
              )}
              {uploadProgress && (
                <span className="text-sm text-gray-600">{uploadProgress}</span>
              )}
              <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm">
                <Upload className="w-4 h-4" />
                {uploading ? 'Загрузка...' : 'Загрузить'}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4">
        {/* Поиск */}
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 mb-3 md:mb-4 border">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по номеру счета, поставщику, ИНН, сумме..."
            className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
          />
        </div>
        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 mb-3 md:mb-4 border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Проект
              </label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 border rounded text-[16px] md:text-sm"
              >
                <option value="all">Все проекты</option>
                <option value="unlinked">Без проекта</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Поставщик
              </label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 border rounded text-[16px] md:text-sm"
              >
                <option value="all">Все поставщики</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Период
              </label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 border rounded text-[16px] md:text-sm"
              >
                <option value="all">Весь период</option>
                <option value="today">Сегодня</option>
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
                <option value="quarter">Квартал</option>
                <option value="year">Год</option>
                <option value="custom">Свой период</option>
              </select>
            </div>

            {filterPeriod === 'custom' && (
              <div className="flex gap-2 md:col-span-1">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    От
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 md:px-3 py-1.5 md:py-2 border rounded text-[16px] md:text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    До
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-2 md:px-3 py-1.5 md:py-2 border rounded text-[16px] md:text-sm"
                  />
                </div>
              </div>
            )}

            {(filterProject !== 'all' || filterSupplier !== 'all' || filterPeriod !== 'all') && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterProject('all');
                    setFilterSupplier('all');
                    setFilterPeriod('all');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-100 rounded border w-full md:w-auto"
                >
                  Сбросить
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Модальное окно редактирования */}
        {editingInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-semibold text-gray-900">Редактирование счета</h2>
                <button
                  onClick={() => setEditingInvoice(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={saveInvoiceEdit} className="p-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Номер счета *
                    </label>
                    <input
                      type="text"
                      required
                      value={editData.invoice_number}
                      onChange={(e) => setEditData({ ...editData, invoice_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата счета *
                    </label>
                    <input
                      type="date"
                      required
                      value={editData.invoice_date}
                      onChange={(e) => setEditData({ ...editData, invoice_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Поставщик *
                    </label>
                    <select
                      required
                      value={editData.supplier_id}
                      onChange={(e) => setEditData({ ...editData, supplier_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите поставщика</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.inn})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {editData.supplier_id && suppliers.find(s => s.id === editData.supplier_id)?.category && (
                        <span>Категория: {expenseCategoryMap[suppliers.find(s => s.id === editData.supplier_id)?.category as SupplierCategory]}</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сумма *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editData.total_amount}
                      onChange={(e) => setEditData({ ...editData, total_amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      НДС
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.vat_amount}
                      onChange={(e) => setEditData({ ...editData, vat_amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Необязательно"
                    />
                  </div>

                  {editingInvoice.file_url && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Файл
                      </label>
                      <a 
                        href={editingInvoice.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        📎 Открыть оригинальный файл
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingInvoice(null)}
                    className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Сохранить
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Окно выбора проекта - компактное модальное окно */}
        {showProjectSelect && (
          <>
            {/* Затемнённый фон для закрытия по клику */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-30 z-40"
              onClick={() => {
                setShowProjectSelect(false);
                setProjectSearchQuery('');
              }}
            />
            {/* Модальное окно */}
            <div className="fixed inset-x-4 top-1/4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-96 bg-white rounded-lg shadow-xl border z-50 max-h-[60vh] flex flex-col">
              <div className="flex items-center justify-between p-3 border-b">
                <h3 className="font-semibold text-gray-900">Привязать к проекту ({selectedInvoices.size} шт.)</h3>
                <button
                  onClick={() => {
                    setShowProjectSelect(false);
                    setProjectSearchQuery('');
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-2 border-b">
                <input
                  type="text"
                  placeholder="Поиск проекта..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {projects.length === 0 ? (
                  <p className="text-sm text-gray-500 p-2">Нет доступных проектов</p>
                ) : (
                  projects
                    .filter(p => {
                      if (!projectSearchQuery) return true;
                      const search = projectSearchQuery.toLowerCase();
                      return p.title.toLowerCase().includes(search) || p.client.toLowerCase().includes(search);
                    })
                    .map(project => (
                    <button
                      key={project.id}
                      onClick={() => linkToProject(project.id)}
                      className="w-full p-2 text-left rounded hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{project.title}</div>
                        <div className="text-xs text-gray-500 truncate">{project.client}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">
              {invoices.length === 0 ? 'Счетов пока нет' : 'Нет счетов, соответствующих фильтрам'}
            </p>
            {invoices.length === 0 && (
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm">
                <Upload className="w-4 h-4" />
                Загрузить счет
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        ) : (
          <>
            {/* Десктопная таблица */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                        onChange={toggleAllInvoices}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">№</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Номер счета</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Дата</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Проект</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Поставщик</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">ИНН</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Категория</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Сумма</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">НДС</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Файл</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInvoices.map((invoice, idx) => {
                    const dupInfo = duplicateWarnings.get(invoice.id);
                    return (
                    <React.Fragment key={invoice.id}>
                    <tr 
                      className={`transition-colors ${
                        dupInfo ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                        selectedInvoices.has(invoice.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => toggleInvoiceSelection(invoice.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {dupInfo && <AlertTriangle className="w-4 h-4 text-yellow-600 inline mr-1" />}
                        {invoices.length - idx}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">{invoice.invoice_number}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {invoice.project_id ? (
                          <a 
                            href={`/projects/${invoice.project_id}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {projects.find(p => p.id === invoice.project_id)?.title || 'Проект'}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-900">{invoice.suppliers?.name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 font-mono text-xs">{invoice.suppliers?.inn || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                          {expenseCategoryMap[invoice.suppliers?.category as SupplierCategory] || invoice.suppliers?.category || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {invoice.total_amount ? `${(invoice.total_amount / 1000).toFixed(1)}к ₽` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {invoice.vat_amount ? `${(invoice.vat_amount / 1000).toFixed(1)}к ₽` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {invoice.file_url ? (
                          <a 
                            href={invoice.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📎
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => openEditInvoice(invoice)}
                          className="text-gray-600 hover:text-blue-600 p-1"
                          title="Редактировать счет"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {/* Строка предупреждения о дубликате */}
                    {dupInfo && (
                      <tr key={`dup-${invoice.id}`} className="bg-yellow-50">
                        <td colSpan={12} className="px-4 py-3">
                          <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                Возможный дубликат!
                              </div>
                              <div className="text-xs text-yellow-700 mt-1">
                                Совпадает со счётом #{dupInfo.duplicates[0]?.invoice_number} от {' '}
                                {dupInfo.duplicates[0]?.invoice_date && new Date(dupInfo.duplicates[0].invoice_date).toLocaleDateString('ru-RU')}
                                {' '}({dupInfo.duplicates[0]?.matches?.join(', ')})
                                {dupInfo.duplicates[0]?.file_url && (
                                  <a href={dupInfo.duplicates[0].file_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                                    📎 Открыть оригинал
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDuplicateAction(invoice.id, 'delete')}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded border border-red-300"
                                title="Удалить этот новый счёт"
                              >
                                <Trash2 className="w-3 h-3" />
                                Удалить новый
                              </button>
                              <button
                                onClick={() => handleDuplicateAction(invoice.id, 'update')}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded border border-blue-300"
                                title="Удалить старый счёт, оставить новый"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Заменить старый
                              </button>
                              <button
                                onClick={() => handleDuplicateAction(invoice.id, 'keep')}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded border border-green-300"
                                title="Оставить оба счёта"
                              >
                                <Check className="w-3 h-3" />
                                Оставить оба
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                  })}
                </tbody>
              </table>
            </div>

            {/* Мобильные карточки */}
            <div className="md:hidden space-y-2">
              {filteredInvoices.map((invoice, idx) => {
                const dupInfo = duplicateWarnings.get(invoice.id);
                return (
                <div 
                  key={invoice.id}
                  className={`bg-white rounded-lg shadow-sm border p-3 ${
                    dupInfo ? 'border-yellow-400 bg-yellow-50' :
                    selectedInvoices.has(invoice.id) ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  {/* Предупреждение о дубликате (мобильная версия) */}
                  {dupInfo && (
                    <div className="mb-3 pb-3 border-b border-yellow-300">
                      <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        Возможный дубликат!
                      </div>
                      <div className="text-xs text-yellow-700 mb-2">
                        Совпадает: {dupInfo.duplicates[0]?.matches?.join(', ')}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleDuplicateAction(invoice.id, 'delete')}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-red-100 text-red-700 rounded border border-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                          Удалить
                        </button>
                        <button
                          onClick={() => handleDuplicateAction(invoice.id, 'update')}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-100 text-blue-700 rounded border border-blue-300"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Заменить
                        </button>
                        <button
                          onClick={() => handleDuplicateAction(invoice.id, 'keep')}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-green-100 text-green-700 rounded border border-green-300"
                        >
                          <Check className="w-3 h-3" />
                          Оба
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Строка 1: Чекбокс + Номер счета + Дата + Действия */}
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.has(invoice.id)}
                      onChange={() => toggleInvoiceSelection(invoice.id)}
                      className="min-w-[28px] min-h-[28px] text-blue-600 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {invoice.file_url && (
                        <a 
                          href={invoice.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-9 h-9 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded"
                        >
                          📎
                        </a>
                      )}
                      <button
                        onClick={() => openEditInvoice(invoice)}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Строка 2: Поставщик */}
                  <div className="text-sm text-gray-900 mb-1 truncate">
                    {invoice.suppliers?.name || '—'}
                  </div>

                  {/* Строка 3: Категория + Проект */}
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    {invoice.suppliers?.category && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        {expenseCategoryMap[invoice.suppliers.category as SupplierCategory] || invoice.suppliers.category}
                      </span>
                    )}
                    {invoice.project_id && (
                      <a 
                        href={`/projects/${invoice.project_id}`}
                        className="text-blue-600 hover:underline truncate"
                      >
                        {projects.find(p => p.id === invoice.project_id)?.title || 'Проект'}
                      </a>
                    )}
                  </div>

                  {/* Строка 4: Сумма */}
                  <div className="flex items-baseline gap-2 pt-2 border-t">
                    <div className="text-base font-bold text-gray-900">
                      {invoice.total_amount ? `${(invoice.total_amount / 1000).toFixed(1)}к ₽` : '—'}
                    </div>
                    {invoice.vat_amount && (
                      <div className="text-xs text-gray-500">
                        НДС: {(invoice.vat_amount / 1000).toFixed(1)}к
                      </div>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
