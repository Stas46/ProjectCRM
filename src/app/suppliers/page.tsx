'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Supplier, SupplierCategory, expenseCategoryMap } from '@/types/supplier';
import { Home, Package, Edit, Save, X, Trash2, FileText, ExternalLink } from 'lucide-react';

interface SupplierWithStats extends Supplier {
  invoiceCount: number;
  totalAmount: number;
  totalVat: number;
}

interface SupplierInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  vat_amount: number;
  project_id: string | null;
  file_url: string | null;
  project?: {
    name: string;
  } | null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStats | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    inn: ''
  });

  // Поиск
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (suppliersError) throw suppliersError;

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('supplier_id, total_amount, vat_amount');

      if (invoicesError) throw invoicesError;

      const suppliersWithStats = (suppliersData || []).map(supplier => {
        const supplierInvoices = (invoicesData || []).filter(inv => inv.supplier_id === supplier.id);
        return {
          ...supplier,
          invoiceCount: supplierInvoices.length,
          totalAmount: supplierInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0),
          totalVat: supplierInvoices.reduce((sum, inv) => sum + (Number(inv.vat_amount) || 0), 0)
        };
      });

      setSuppliers(suppliersWithStats);
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSupplierCategory(supplierId: string, newCategory: SupplierCategory) {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ category: newCategory })
        .eq('id', supplierId);

      if (error) throw error;

      setSuppliers(prev =>
        prev.map(s => s.id === supplierId ? { ...s, category: newCategory } : s)
      );
    } catch (error) {
      console.error('Ошибка:', error);
    }
  }

  function openEditSupplier(supplier: SupplierWithStats) {
    setEditingSupplier(supplier);
    setEditData({
      name: supplier.name,
      inn: supplier.inn || ''
    });
    setShowDeleteConfirm(false);
    loadSupplierInvoices(supplier.id);
  }

  async function loadSupplierInvoices(supplierId: string) {
    setLoadingInvoices(true);
    try {
      // Загружаем счета
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_amount, vat_amount, project_id, file_url')
        .eq('supplier_id', supplierId)
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Загружаем проекты для счетов с project_id
      const projectIds = [...new Set((invoicesData || []).filter(i => i.project_id).map(i => i.project_id))];
      let projectsMap: Record<string, string> = {};
      
      if (projectIds.length > 0) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);
        
        projectsMap = (projectsData || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Собираем результат
      const invoicesWithProjects = (invoicesData || []).map(inv => ({
        ...inv,
        project: inv.project_id ? { name: projectsMap[inv.project_id] || '' } : null
      }));

      setSupplierInvoices(invoicesWithProjects);
    } catch (error) {
      console.error('Ошибка загрузки счетов:', error);
      setSupplierInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }

  function closeEditModal() {
    setEditingSupplier(null);
    setEditData({ name: '', inn: '' });
    setSupplierInvoices([]);
    setShowDeleteConfirm(false);
  }

  async function saveSupplierEdit() {
    if (!editingSupplier || isSaving) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          name: editData.name.trim(),
          inn: editData.inn.trim() || null
        })
        .eq('id', editingSupplier.id);

      if (error) throw error;

      // Обновляем локальное состояние
      setSuppliers(prev =>
        prev.map(s => s.id === editingSupplier.id 
          ? { ...s, name: editData.name.trim(), inn: editData.inn.trim() || '' }
          : s
        )
      );

      closeEditModal();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSupplier() {
    if (!editingSupplier || isDeleting) return;

    setIsDeleting(true);
    try {
      // Сначала обнуляем supplier_id у всех счетов этого поставщика
      const { error: invoicesError } = await supabase
        .from('invoices')
        .update({ supplier_id: null })
        .eq('supplier_id', editingSupplier.id);

      if (invoicesError) throw invoicesError;

      // Затем удаляем поставщика
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', editingSupplier.id);

      if (error) throw error;

      // Обновляем локальное состояние
      setSuppliers(prev => prev.filter(s => s.id !== editingSupplier.id));
      closeEditModal();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении поставщика');
    } finally {
      setIsDeleting(false);
    }
  }

  let filteredSuppliers = selectedCategory === 'all'
    ? suppliers
    : suppliers.filter(s => s.category === selectedCategory);

  // Поиск
  if (searchQuery.trim() !== '') {
    const query = searchQuery.trim().toLowerCase();
    filteredSuppliers = filteredSuppliers.filter(supplier => {
      const name = supplier.name?.toLowerCase() || '';
      const inn = supplier.inn?.toLowerCase() || '';
      const category = supplier.category?.toLowerCase() || '';
      const invoiceCount = supplier.invoiceCount?.toString() || '';
      const totalAmount = supplier.totalAmount?.toString() || '';
      return (
        name.includes(query) ||
        inn.includes(query) ||
        category.includes(query) ||
        invoiceCount.includes(query) ||
        totalAmount.includes(query)
      );
    });
  }

  const totalStats = filteredSuppliers.reduce((acc, s) => ({
    suppliers: acc.suppliers + 1,
    invoices: acc.invoices + s.invoiceCount,
    amount: acc.amount + s.totalAmount,
    vat: acc.vat + s.totalVat
  }), { suppliers: 0, invoices: 0, amount: 0, vat: 0 });

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
          <div className="px-4 py-3 space-y-3">
            {/* Строка 1: Навигация + Заголовок */}
            <div className="flex items-center gap-3">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                <Home className="w-5 h-5" />
              </a>
              <Package className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Поставщики</h1>
              <span className="text-sm text-gray-500">({suppliers.length})</span>
            </div>
            
            {/* Строка 2: Фильтр категорий */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-[16px] min-h-[44px]"
            >
              <option value="all">Все категории</option>
              {Object.entries(expenseCategoryMap).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Десктопный хедер */}
        <div className="hidden md:block">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                <Home className="w-5 h-5" />
              </a>
              <Package className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Поставщики</h1>
              <span className="text-sm text-gray-500">({suppliers.length})</span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="all">Все категории</option>
                {Object.entries(expenseCategoryMap).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Поиск */}
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 mb-3 md:mb-4 border">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, ИНН, категории, сумме..."
            className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
          />
        </div>
        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-3 border">
            <div className="text-xs text-gray-600 mb-1">Поставщиков</div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{totalStats.suppliers}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border">
            <div className="text-xs text-gray-600 mb-1">Счетов</div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{totalStats.invoices}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border">
            <div className="text-xs text-gray-600 mb-1">Сумма</div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {(totalStats.amount / 1000).toFixed(0)}к ₽
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border">
            <div className="text-xs text-gray-600 mb-1">НДС</div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {(totalStats.vat / 1000).toFixed(0)}к ₽
            </div>
          </div>
        </div>

        {/* Таблица и карточки */}
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">Поставщиков не найдено</p>
          </div>
        ) : (
          <>
            {/* Десктопная таблица */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Поставщик</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">ИНН</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Категория</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Счетов</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Сумма</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{supplier.name}</td>
                      <td className="px-3 py-2 text-gray-600 font-mono text-xs">{supplier.inn || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={supplier.category || 'general'}
                          onChange={(e) => updateSupplierCategory(supplier.id, e.target.value as SupplierCategory)}
                          className="px-2 py-0.5 text-xs border rounded"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {Object.entries(expenseCategoryMap).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{supplier.invoiceCount}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {supplier.totalAmount ? `${(supplier.totalAmount / 1000).toFixed(1)}к ₽` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => openEditSupplier(supplier)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Редактировать"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Мобильные карточки */}
            <div className="md:hidden space-y-3">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="bg-white rounded-lg shadow-sm border p-4">
                  {/* Строка 1: Название + Кнопка редактирования */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-base mb-1">
                        {supplier.name}
                      </h3>
                      {supplier.inn && (
                        <div className="text-sm text-gray-600 font-mono">
                          ИНН: {supplier.inn}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => openEditSupplier(supplier)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Редактировать"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Строка 2: Категория */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">Категория расхода</label>
                    <select
                      value={supplier.category || 'general'}
                      onChange={(e) => updateSupplierCategory(supplier.id, e.target.value as SupplierCategory)}
                      className="w-full px-3 py-2 border rounded-lg text-[16px] min-h-[44px]"
                    >
                      {Object.entries(expenseCategoryMap).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Строка 3: Статистика */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Счетов</div>
                      <div className="text-lg font-semibold text-gray-900">{supplier.invoiceCount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-0.5">Всего</div>
                      <div className="text-lg font-bold text-gray-900">
                        {supplier.totalAmount ? `${(supplier.totalAmount / 1000).toFixed(1)}к ₽` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Модальное окно редактирования */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Редактировать поставщика</h3>
              <button
                onClick={closeEditModal}
                disabled={isSaving || isDeleting}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-[16px] min-h-[44px]"
                  placeholder="Название компании"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ИНН
                </label>
                <input
                  type="text"
                  value={editData.inn}
                  onChange={(e) => setEditData({ ...editData, inn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-[16px] font-mono min-h-[44px]"
                  placeholder="ИНН (10 или 12 цифр)"
                  maxLength={12}
                />
              </div>

              {/* Счета поставщика */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700">
                      Счета ({supplierInvoices.length})
                    </label>
                  </div>
                  {supplierInvoices.length > 0 && (
                    <div className="text-sm font-semibold text-gray-900">
                      Итого: {supplierInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                </div>
                
                {loadingInvoices ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                  </div>
                ) : supplierInvoices.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg text-center">
                    Нет счетов
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {supplierInvoices.map((invoice) => (
                      <div 
                        key={invoice.id} 
                        onClick={() => {
                          if (invoice.file_url) {
                            window.open(invoice.file_url, '_blank');
                          }
                        }}
                        className={`p-2 hover:bg-gray-50 flex items-center justify-between gap-2 ${invoice.file_url ? 'cursor-pointer' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">
                              №{invoice.invoice_number}
                            </span>
                            <span className="text-xs text-gray-500">
                              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('ru-RU') : '—'}
                            </span>
                          </div>
                          {invoice.project && (
                            <div className="text-xs text-gray-500 truncate">
                              {(invoice.project as { name: string }).name}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.total_amount?.toLocaleString('ru-RU')} ₽
                          </div>
                          {invoice.vat_amount && invoice.vat_amount > 0 && (
                            <div className="text-xs text-gray-500">
                              НДС: {invoice.vat_amount.toLocaleString('ru-RU')} ₽
                            </div>
                          )}
                        </div>
                        {invoice.file_url && (
                          <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Кнопка удаления */}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить поставщика
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 mb-3">
                    <strong>Вы уверены?</strong> Поставщик будет удален.
                    {supplierInvoices.length > 0 && (
                      <> У {supplierInvoices.length} счетов будет убрана привязка к поставщику.</>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={deleteSupplier}
                      disabled={isDeleting}
                      className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Удаление...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Удалить
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={closeEditModal}
                disabled={isSaving || isDeleting}
                className="flex-1 px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 min-h-[44px] disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={saveSupplierEdit}
                disabled={!editData.name.trim() || isSaving || isDeleting}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Сохранить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
