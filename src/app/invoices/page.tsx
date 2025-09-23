'use client';

import AppLayout from '@/components/app-layout';
import InvoiceCard from '@/components/invoice-card';
import InvoiceFilters from '@/components/invoice-filters';
import { Plus, FileUp, FileDown, PieChart } from 'lucide-react';
import { useState } from 'react';

// Типы данных
interface Invoice {
  id: string;
  projectId: string;
  projectTitle: string;
  vendor: string;
  number: string;
  issueDate: string;
  amount: number;
  status: 'draft' | 'to_pay' | 'paid' | 'rejected';
  category: string;
  hasAttachment: boolean;
}

// Временные данные
const mockInvoices: Invoice[] = [
  {
    id: '1',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    vendor: 'ООО "СтеклоПром"',
    number: '2025-0356',
    issueDate: '2025-09-15',
    amount: 450000,
    status: 'paid',
    category: 'Материалы',
    hasAttachment: true,
  },
  {
    id: '2',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    vendor: 'ИП Соколов А.В.',
    number: '78-2025',
    issueDate: '2025-09-18',
    amount: 125000,
    status: 'to_pay',
    category: 'Монтаж',
    hasAttachment: true,
  },
  {
    id: '3',
    projectId: '2',
    projectTitle: 'Коттедж Иванова',
    vendor: 'ООО "ФурнитураПлюс"',
    number: '2025/09-42',
    issueDate: '2025-09-10',
    amount: 85000,
    status: 'paid',
    category: 'Фурнитура',
    hasAttachment: true,
  },
  {
    id: '4',
    projectId: '3',
    projectTitle: 'Офисный центр "Горизонт"',
    vendor: 'ООО "АлюмСистемс"',
    number: 'ТН-2025-1204',
    issueDate: '2025-09-05',
    amount: 780000,
    status: 'paid',
    category: 'ПВХ/Алюминий',
    hasAttachment: false,
  },
  {
    id: '5',
    projectId: '3',
    projectTitle: 'Офисный центр "Горизонт"',
    vendor: 'ООО "ТрансЛогистик"',
    number: '456-Т',
    issueDate: '2025-09-12',
    amount: 45000,
    status: 'to_pay',
    category: 'Логистика',
    hasAttachment: true,
  },
  {
    id: '6',
    projectId: '4',
    projectTitle: 'Ресторан "Панорама"',
    vendor: 'ИП Николаев С.С.',
    number: '2025/09-17',
    issueDate: '2025-09-17',
    amount: 35000,
    status: 'draft',
    category: 'Прочее',
    hasAttachment: false,
  },
];

export default function InvoicesPage() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: [] as string[],
    category: [] as string[],
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined,
  });
  
  // Статистика по счетам
  const totalAmount = mockInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidAmount = mockInvoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const toPayAmount = mockInvoices
    .filter(invoice => invoice.status === 'to_pay')
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  
  // Фильтрация счетов
  const filteredInvoices = mockInvoices.filter(invoice => {
    // Поиск
    const matchesSearch = !filters.search || 
      invoice.vendor.toLowerCase().includes(filters.search.toLowerCase()) ||
      invoice.number.toLowerCase().includes(filters.search.toLowerCase()) ||
      invoice.projectTitle.toLowerCase().includes(filters.search.toLowerCase());
    
    // Статус
    const matchesStatus = filters.status.length === 0 || 
      filters.status.includes(invoice.status);
    
    // Категория
    const matchesCategory = filters.category.length === 0 || 
      filters.category.includes(invoice.category.toLowerCase());
    
    // Период
    const issueDate = new Date(invoice.issueDate);
    const matchesDateFrom = !filters.dateFrom || 
      issueDate >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || 
      issueDate <= new Date(filters.dateTo);
    
    return matchesSearch && matchesStatus && matchesCategory && matchesDateFrom && matchesDateTo;
  });
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Счета</h1>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
          >
            <Plus size={20} className="mr-2" />
            Новый счет
          </button>
        </div>
      
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Всего по счетам</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Оплачено</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">К оплате</h3>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(toPayAmount)}</p>
        </div>
      </div>
      
      {/* Фильтры */}
      <InvoiceFilters onFilterChange={setFilters} />
      
      {/* Действия с выбранными */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          {filteredInvoices.length} {getInvoiceCountText(filteredInvoices.length)}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FileUp size={16} className="mr-2" />
            Импорт
          </button>
          
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FileDown size={16} className="mr-2" />
            Экспорт
          </button>
          
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <PieChart size={16} className="mr-2" />
            Отчет
          </button>
        </div>
      </div>
      
      {/* Список счетов */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Счета не найдены</h3>
          <p className="text-gray-500">
            Попробуйте изменить параметры фильтрации или создайте новый счет
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map(invoice => (
            <InvoiceCard
              key={invoice.id}
              {...invoice}
              onClick={setSelectedInvoiceId}
            />
          ))}
        </div>
      )}

      {/* Модальное окно просмотра счета - в реальном приложении здесь была бы реализация модального окна */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">Просмотр счета</h2>
            <p>Здесь будет отображаться детальная информация о счете {selectedInvoiceId}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInvoiceId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  );
}

function getInvoiceCountText(count: number): string {
  if (count === 0) return 'счетов';
  if (count === 1) return 'счет';
  if (count >= 2 && count <= 4) return 'счета';
  return 'счетов';
}