const fs = require('fs');
const path = require('path');

const invoicesPage = `'use client';

import { useState, useEffect } from 'react';
import { Upload, Home, FileText } from 'lucide-react';
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
  suppliers?: {
    name: string;
    inn: string;
    category: string;
  };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('invoices')
        .select(\`
          *,
          suppliers (
            name,
            inn,
            category
          )
        \`)
        .order('sequence_number', { ascending: false});

      if (error) throw error;
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
          setUploadProgress(\`Обработка \${i + 1} из \${totalFiles}: \${file.name}...\`);

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
          console.error(\`Ошибка файла \${file.name}:\`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setUploadProgress(\`✅ Обработано: \${successCount}, ошибок: \${errorCount}\`);
        await loadInvoices();
      } else {
        setUploadProgress(\`⚠️ Все файлы завершились с ошибкой\`);
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
            <span className="text-sm text-gray-500">({invoices.length})</span>
          </div>
          <div className="flex items-center gap-3">
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
        {invoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">Счетов пока нет</p>
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
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">№</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Номер счета</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Дата</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Поставщик</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">ИНН</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Категория</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Сумма</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">НДС</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((invoice, idx) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{invoices.length - idx}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{invoice.invoice_number}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-3 py-2 text-gray-900">{invoice.suppliers?.name || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">{invoice.suppliers?.inn || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                        {expenseCategoryMap[invoice.suppliers?.category as SupplierCategory] || invoice.suppliers?.category || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {invoice.total_amount ? \`\${(invoice.total_amount / 1000).toFixed(1)}к ₽\` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {invoice.vat_amount ? \`\${(invoice.vat_amount / 1000).toFixed(1)}к ₽\` : '—'}
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

fs.writeFileSync(path.join(__dirname, 'src', 'app', 'invoices', 'page.tsx'), invoicesPage, 'utf8');
console.log('✅ Страница счетов обновлена');
