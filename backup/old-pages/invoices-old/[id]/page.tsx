'use client';

import AppLayout from '@/components/app-layout';
import { 
  ArrowLeft, 
  Edit, 
  MoreVertical, 
  Calendar, 
  FileText, 
  Plus,
  FileUp,
  Download,
  Printer,
  Building,
  Phone, 
  Mail,
  Trash2,
  FileBox,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  User,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// Типы данных
interface InvoiceDetails {
  id: string;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  project: {
    id: string;
    name: string;
  };
  client: {
    name: string;
    company: string;
    phone: string;
    email: string;
    address: string;
  };
  items: {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    price: number;
  }[];
  notes?: string;
  subtotal: number;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  tax?: {
    name: string;
    percentage: number;
  };
  total: number;
  payments: {
    id: string;
    date: string;
    amount: number;
    method: 'cash' | 'bank_transfer' | 'card' | 'other';
    notes?: string;
  }[];
  files: {
    id: string;
    name: string;
    type: string;
    size: string;
    uploadDate: string;
    url: string;
  }[];
  createdBy: {
    id: string;
    name: string;
    initials: string;
  };
}

// Временные данные
const mockInvoice: InvoiceDetails = {
  id: '1',
  number: 'СЧТ-2025-001',
  status: 'sent',
  issueDate: '2025-09-15',
  dueDate: '2025-10-15',
  project: {
    id: '1',
    name: 'ЖК "Морской бриз"',
  },
  client: {
    name: 'Сергей Петров',
    company: 'ООО "СтройИнвест"',
    phone: '+7 (901) 123-45-67',
    email: 'petrov@stroyinvest.ru',
    address: 'г. Москва, ул. Строителей, д. 10, офис 5',
  },
  items: [
    {
      id: '1',
      description: 'Энергосберегающие стеклопакеты 1200x1500 мм',
      quantity: 25,
      unit: 'шт',
      price: 12500,
    },
    {
      id: '2',
      description: 'Монтажные работы (стандартный монтаж)',
      quantity: 25,
      unit: 'шт',
      price: 3500,
    },
    {
      id: '3',
      description: 'Подоконники (ПВХ, белый)',
      quantity: 25,
      unit: 'шт',
      price: 2000,
    },
  ],
  notes: 'Оплата в течение 30 дней. При оплате после указанного срока начисляется пеня в размере 0,1% от суммы счета за каждый день просрочки.',
  subtotal: 450000,
  discount: {
    type: 'percentage',
    value: 5,
  },
  tax: {
    name: 'НДС',
    percentage: 20,
  },
  total: 513000,
  payments: [
    {
      id: '1',
      date: '2025-09-20',
      amount: 150000,
      method: 'bank_transfer',
      notes: 'Предоплата 30%',
    },
  ],
  files: [
    {
      id: '1',
      name: 'Счет_СЧТ-2025-001.pdf',
      type: 'pdf',
      size: '420 KB',
      uploadDate: '2025-09-15',
      url: '/files/invoice-1',
    },
    {
      id: '2',
      name: 'Спецификация.xlsx',
      type: 'xlsx',
      size: '280 KB',
      uploadDate: '2025-09-15',
      url: '/files/invoice-2',
    },
  ],
  createdBy: {
    id: '1',
    name: 'Иванов И.И.',
    initials: 'ИИ',
  },
};

const statusMap = {
  draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-800', icon: FileText },
  sent: { label: 'Отправлен', color: 'bg-blue-100 text-blue-800', icon: Clock },
  paid: { label: 'Оплачен', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  overdue: { label: 'Просрочен', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  cancelled: { label: 'Отменен', color: 'bg-gray-100 text-gray-800', icon: Trash2 },
};

const paymentMethodMap = {
  cash: 'Наличные',
  bank_transfer: 'Банковский перевод',
  card: 'Карта',
  other: 'Другое',
};

export default function InvoicePage() {
  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'files'>('details');
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const StatusIcon = statusMap[mockInvoice.status].icon;
  
  const calculatePaid = () => {
    return mockInvoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  };
  
  const calculateBalance = () => {
    const paid = calculatePaid();
    return mockInvoice.total - paid;
  };
  
  const calculateDiscountAmount = () => {
    if (!mockInvoice.discount) return 0;
    
    if (mockInvoice.discount.type === 'percentage') {
      return (mockInvoice.subtotal * mockInvoice.discount.value) / 100;
    }
    
    return mockInvoice.discount.value;
  };
  
  const calculateTaxAmount = () => {
    if (!mockInvoice.tax) return 0;
    
    const afterDiscount = mockInvoice.subtotal - calculateDiscountAmount();
    return (afterDiscount * mockInvoice.tax.percentage) / 100;
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center">
          <Link href="/invoices" className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          
          <div>
            <div className="flex items-center mb-1">
              <Link href={`/projects/${mockInvoice.project.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                {mockInvoice.project.name}
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Счет #{mockInvoice.number}</h1>
            <div className="flex items-center mt-2">
              <span className={`flex items-center text-xs px-2.5 py-1 rounded-full ${statusMap[mockInvoice.status].color}`}>
                <StatusIcon size={14} className="mr-1" />
                {statusMap[mockInvoice.status].label}
              </span>
              
              <span className="mx-2 text-gray-300">•</span>
              
              <span className="text-sm text-gray-500">
                от {formatDate(mockInvoice.issueDate)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <button
            type="button"
            className="mr-2 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Printer size={16} className="mr-2" />
            Печать
          </button>
          
          <button
            type="button"
            className="mr-2 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
          >
            <Edit size={16} className="mr-2" />
            Редактировать
          </button>
          
          <div className="relative">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Табы */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Детали счета
          </button>
          
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-4 px-1 text-sm font-medium border-b-2 flex items-center ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Платежи
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {mockInvoice.payments.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('files')}
            className={`py-4 px-1 text-sm font-medium border-b-2 flex items-center ${
              activeTab === 'files'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Файлы
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {mockInvoice.files.length}
            </span>
          </button>
        </nav>
      </div>
      
      {/* Содержимое вкладки Детали */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Позиции счета */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Позиции счета</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Описание
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Кол-во
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Цена
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Сумма
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockInvoice.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-normal">
                          <div className="text-sm text-gray-900">{item.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-900">{item.quantity} {item.unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-900">{formatCurrency(item.price)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(item.quantity * item.price)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                        Подытог:
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(mockInvoice.subtotal)}
                      </td>
                    </tr>
                    
                    {mockInvoice.discount && (
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                          Скидка ({mockInvoice.discount.type === 'percentage' ? `${mockInvoice.discount.value}%` : formatCurrency(mockInvoice.discount.value)}):
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-red-600">
                          -{formatCurrency(calculateDiscountAmount())}
                        </td>
                      </tr>
                    )}
                    
                    {mockInvoice.tax && (
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                          {mockInvoice.tax.name} ({mockInvoice.tax.percentage}%):
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(calculateTaxAmount())}
                        </td>
                      </tr>
                    )}
                    
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                        Итого:
                      </td>
                      <td className="px-6 py-3 text-right text-base font-bold text-gray-900">
                        {formatCurrency(mockInvoice.total)}
                      </td>
                    </tr>
                    
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                        Оплачено:
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-green-600">
                        {formatCurrency(calculatePaid())}
                      </td>
                    </tr>
                    
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                        К оплате:
                      </td>
                      <td className="px-6 py-3 text-right text-base font-bold text-blue-600">
                        {formatCurrency(calculateBalance())}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {mockInvoice.notes && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Примечания:</h3>
                  <p className="text-sm text-gray-600">{mockInvoice.notes}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Информация о счете */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Информация о счете</h2>
              
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FileText size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Номер счета</p>
                    <p className="text-sm text-gray-900">{mockInvoice.number}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <Calendar size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Дата выставления</p>
                    <p className="text-sm text-gray-900">{formatDate(mockInvoice.issueDate)}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <Clock size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Срок оплаты</p>
                    <p className="text-sm text-gray-900">{formatDate(mockInvoice.dueDate)}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <DollarSign size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Сумма</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(mockInvoice.total)}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <CheckCircle size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Оплачено</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(calculatePaid())}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <AlertCircle size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Остаток к оплате</p>
                    <p className="text-sm font-medium text-blue-600">{formatCurrency(calculateBalance())}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <User size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Создал</p>
                    <p className="text-sm text-gray-900">{mockInvoice.createdBy.name}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <ExternalLink size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Проект</p>
                    <Link href={`/projects/${mockInvoice.project.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                      {mockInvoice.project.name}
                    </Link>
                  </div>
                </li>
              </ul>
              
              <div className="mt-6">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
                  onClick={() => setActiveTab('payments')}
                >
                  <Plus size={16} className="mr-2" />
                  Добавить платеж
                </button>
              </div>
            </div>
            
            {/* Информация о клиенте */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Информация о клиенте</h2>
              
              <ul className="space-y-3">
                <li className="flex items-start">
                  <User size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Контактное лицо</p>
                    <p className="text-sm text-gray-900">{mockInvoice.client.name}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <Building size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Компания</p>
                    <p className="text-sm text-gray-900">{mockInvoice.client.company}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <Phone size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Телефон</p>
                    <p className="text-sm text-gray-900">{mockInvoice.client.phone}</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <Mail size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{mockInvoice.client.email}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Содержимое вкладки Платежи */}
      {activeTab === 'payments' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Платежи</h2>
            
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            >
              <Plus size={16} className="mr-2" />
              Добавить платеж
            </button>
          </div>
          
          {mockInvoice.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Способ оплаты
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Примечание
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockInvoice.payments.map(payment => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(payment.date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">{formatCurrency(payment.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CreditCard size={16} className="mr-2 text-gray-400" />
                          <span className="text-sm text-gray-900">{paymentMethodMap[payment.method]}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{payment.notes || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Платежи по счету отсутствуют</p>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
              >
                <Plus size={16} className="mr-2" />
                Добавить платеж
              </button>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Итого по счету:</p>
                <p className="text-lg font-medium text-gray-900">{formatCurrency(mockInvoice.total)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Оплачено:</p>
                <p className="text-lg font-medium text-green-600">{formatCurrency(calculatePaid())}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Остаток:</p>
                <p className="text-lg font-medium text-blue-600">{formatCurrency(calculateBalance())}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Содержимое вкладки Файлы */}
      {activeTab === 'files' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Файлы</h2>
            
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            >
              <FileUp size={16} className="mr-2" />
              Загрузить файл
            </button>
          </div>
          
          {mockInvoice.files.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Имя файла
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата загрузки
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Размер
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockInvoice.files.map(file => (
                    <tr key={file.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {file.type === 'pdf' ? (
                            <FileText size={20} className="text-red-500 mr-3" />
                          ) : file.type === 'xlsx' ? (
                            <FileBox size={20} className="text-green-500 mr-3" />
                          ) : (
                            <FileText size={20} className="text-gray-400 mr-3" />
                          )}
                          <span className="text-sm text-gray-900">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(file.uploadDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{file.size}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-700 mr-3"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-900"
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
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Файлы отсутствуют</p>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
              >
                <FileUp size={16} className="mr-2" />
                Загрузить файл
              </button>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}