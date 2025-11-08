const fs = require('fs');

const content = `'use client';

import { useEffect, useState } from 'react';
import { Supplier, expenseCategoryMap, SupplierCategory } from '@/types/supplier';
import { Invoice } from '@/types/invoice';
import { Building2, Package, TrendingUp, Calendar, Banknote, FileText, ChevronDown, ChevronRight } from 'lucide-react';

interface SupplierWithStats extends Supplier {
  invoice_count: number;
  total_amount: number;
  total_vat: number;
  first_invoice_date: string | null;
  last_invoice_date: string | null;
  invoices?: Invoice[];
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SupplierCategory | 'all'>('all');

  useEffect(() => {
    loadSuppliers();
  }, [dateFrom, dateTo, selectedCategory]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('@/lib/supabase');

      let suppliersQuery = supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (selectedCategory !== 'all') {
        suppliersQuery = suppliersQuery.eq('category', selectedCategory);
      }

      const { data: suppliersData, error: suppliersError } = await suppliersQuery;
      if (suppliersError) throw suppliersError;

      let invoicesQuery = supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (dateFrom) {
        invoicesQuery = invoicesQuery.gte('invoice_date', dateFrom);
      }
      if (dateTo) {
        invoicesQuery = invoicesQuery.lte('invoice_date', dateTo);
      }

      const { data: invoicesData, error: invoicesError } = await invoicesQuery;
      if (invoicesError) throw invoicesError;

      const supplierStats = suppliersData?.map(supplier => {
        const supplierInvoices = invoicesData?.filter(inv => inv.supplier_id === supplier.id) || [];
        
        const stats = {
          invoice_count: supplierInvoices.length,
          total_amount: supplierInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
          total_vat: supplierInvoices.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0),
          first_invoice_date: supplierInvoices.length > 0 
            ? supplierInvoices[supplierInvoices.length - 1].invoice_date 
            : null,
          last_invoice_date: supplierInvoices.length > 0 
            ? supplierInvoices[0].invoice_date 
            : null,
          invoices: supplierInvoices
        };

        return { ...supplier, ...stats };
      }) || [];

      supplierStats.sort((a, b) => b.total_amount - a.total_amount);
      setSuppliers(supplierStats);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSupplier = (supplierId: string) => {
    setExpandedSupplier(expandedSupplier === supplierId ? null : supplierId);
  };

  const updateSupplierCategory = async (supplierId: string, category: SupplierCategory) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('suppliers')
        .update({ category })
        .eq('id', supplierId);

      if (error) throw error;

      setSuppliers(prev => prev.map(s => 
        s.id === supplierId ? { ...s, category } : s
      ));

      console.log('✅ Категория обновлена');
    } catch (err) {
      console.error('❌ Ошибка:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ₽';
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ru-RU');
  };

  const totalStats = {
    suppliers: suppliers.length,
    invoices: suppliers.reduce((sum, s) => sum + s.invoice_count, 0),
    amount: suppliers.reduce((sum, s) => sum + s.total_amount, 0),
    vat: suppliers.reduce((sum, s) => sum + s.total_vat, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Поставщики</h1>
          <p className="text-gray-600">Управление поставщиками и анализ счетов</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Категория
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as SupplierCategory | 'all')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Все категории</option>
                {Object.entries(expenseCategoryMap).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Период с
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Период по
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Поставщиков</div>
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.suppliers}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Счетов</div>
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.invoices}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Общая сумма</div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalStats.amount)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">НДС</div>
              <Banknote className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalStats.vat)}</div>
          </div>
        </div>

        <div className="space-y-4">
          {suppliers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Поставщиков пока нет</p>
              <p className="text-gray-400 text-sm mt-2">Загрузите первый счёт для автоматического создания поставщика</p>
            </div>
          ) : (
            suppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSupplier(supplier.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{supplier.name}</h3>
                        {expandedSupplier === supplier.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">ИНН</div>
                          <div className="text-sm font-medium text-gray-900">{supplier.inn || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Счетов</div>
                          <div className="text-sm font-medium text-gray-900">{supplier.invoice_count}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Сумма</div>
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(supplier.total_amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">НДС</div>
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(supplier.total_vat)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <select
                            value={supplier.category || 'other'}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateSupplierCategory(supplier.id, e.target.value as SupplierCategory);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {Object.entries(expenseCategoryMap).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                        {supplier.first_invoice_date && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {formatDate(supplier.first_invoice_date)} - {formatDate(supplier.last_invoice_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {expandedSupplier === supplier.id && supplier.invoices && supplier.invoices.length > 0 && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Счета поставщика:</h4>
                    <div className="space-y-2">
                      {supplier.invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono font-semibold text-gray-900">
                                Счет № {invoice.invoice_number}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(invoice.invoice_date)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-900">
                                {formatCurrency(invoice.total_amount || 0)}
                              </div>
                              {invoice.vat_amount && (
                                <div className="text-sm text-gray-500">
                                  НДС: {formatCurrency(invoice.vat_amount)}
                                </div>
                              )}
                            </div>
                            {invoice.file_url && (
                              <a
                                href={invoice.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                Открыть файл
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/suppliers/page.tsx', content, 'utf-8');
console.log('✅ Страница поставщиков обновлена');
