'use client';

import { useState, useEffect, useMemo } from 'react';
import { Upload, Home, FileText, Trash2, Link as LinkIcon, X, Edit, Save } from 'lucide-react';
import { expenseCategoryMap, SupplierCategory } from '@/types/supplier';

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

  // Фильтры
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

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
        } catch (err) {
          console.error(`Ошибка файла ${file.name}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setUploadProgress(`✅ Обработано: ${successCount}, ошибок: ${errorCount}`);
        await loadInvoices();
      } else {
        setUploadProgress(`⚠️ Все файлы завершились с ошибкой`);
      }

      setTimeout(() => setUploadProgress(''), 3000);
    } catch (err) {
      console.error('Ошибка:', err);
      setUploadProgress('❌ Ошибка загрузки');
      setTimeout(() => setUploadProgress(''), 3000);
    } finally {
      setUploading(false);
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
  }, [invoices, filterProject, filterSupplier, filterPeriod, customStartDate, customEndDate]);

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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-600 hover:text-gray-900">
              <Home className="w-5 h-5" />
            </a>
            <FileText className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Счета</h1>
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

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Проект
              </label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full px-2 py-1.5 border rounded text-sm"
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
                className="w-full px-2 py-1.5 border rounded text-sm"
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
                className="w-full px-2 py-1.5 border rounded text-sm"
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
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    От
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded text-sm"
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
                    className="w-full px-2 py-1.5 border rounded text-sm"
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
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded border"
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

        {/* Окно выбора проекта */}
        {showProjectSelect && (
          <div className="mb-4 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Выберите проект для привязки ({selectedInvoices.size} счетов)</h3>
              <button
                onClick={() => setShowProjectSelect(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {projects.length === 0 ? (
                <p className="text-sm text-gray-500 col-span-2">Нет доступных проектов</p>
              ) : (
                projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => linkToProject(project.id)}
                    className="p-3 text-left border rounded hover:bg-blue-50 hover:border-blue-500 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{project.title}</div>
                    <div className="text-sm text-gray-600">{project.client}</div>
                  </button>
                ))
              )}
            </div>
          </div>
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
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
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
                {filteredInvoices.map((invoice, idx) => (
                  <tr 
                    key={invoice.id} 
                    className={`transition-colors ${
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
                    <td className="px-3 py-2 text-gray-500">{invoices.length - idx}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
