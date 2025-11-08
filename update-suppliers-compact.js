const fs = require('fs');
const path = require('path');

const compactSuppliersPage = `'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Supplier, SupplierCategory, expenseCategoryMap } from '@/types/supplier';
import { Home, Package } from 'lucide-react';

interface SupplierWithStats extends Supplier {
  invoiceCount: number;
  totalAmount: number;
  totalVat: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  const filteredSuppliers = selectedCategory === 'all'
    ? suppliers
    : suppliers.filter(s => s.category === selectedCategory);

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

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Статистика */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-3 border">
            <div className="text-xs text-gray-600 mb-1">Поставщиков</div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.suppliers}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border">
            <div className="text-xs text-gray-600 mb-1">Счетов</div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.invoices}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border">
            <div className="text-xs text-gray-600 mb-1">Сумма</div>
            <div className="text-2xl font-bold text-gray-900">
              {(totalStats.amount / 1000).toFixed(0)}к ₽
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border">
            <div className="text-xs text-gray-600 mb-1">НДС</div>
            <div className="text-2xl font-bold text-gray-900">
              {(totalStats.vat / 1000).toFixed(0)}к ₽
            </div>
          </div>
        </div>

        {/* Таблица */}
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">Поставщиков не найдено</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Поставщик</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">ИНН</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Категория</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Счетов</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Сумма</th>
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
                      {supplier.totalAmount ? \`\${(supplier.totalAmount / 1000).toFixed(1)}к ₽\` : '—'}
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
`;

const filePath = path.join(__dirname, 'src', 'app', 'suppliers', 'page.tsx');
fs.writeFileSync(filePath, compactSuppliersPage, 'utf8');
console.log('✅ Компактная страница поставщиков создана');
console.log('\\n🎨 Все страницы обновлены на компактный дизайн:');
console.log('  ✅ Главная - простое меню');
console.log('  ✅ Проекты - таблица');
console.log('  ✅ Счета - таблица');
console.log('  ✅ Поставщики - таблица с статистикой');
console.log('\\n📐 Компактность:');
console.log('  - Минимальные отступы (py-2, px-3)');
console.log('  - Суммы в тысячах (123к ₽)');
console.log('  - Шапка с навигацией');
console.log('  - Все помещается на один экран');
