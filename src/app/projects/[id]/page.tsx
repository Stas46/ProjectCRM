'use client';

import AppLayout from '@/components/app-layout';
import TaskCard from '@/components/task-card';
import { 
  ArrowLeft, 
  Edit, 
  MoreVertical, 
  Clock, 
  Calendar, 
  User, 
  MapPin,
  FileText, 
  Plus,
  Building,
  Phone, 
  Mail,
  Trash2,
  Gauge,
  Download,
  Image as ImageIcon,
  FileUp,
  FileBox
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// Типы данных
interface ProjectDetails {
  id: string;
  title: string;
  description: string;
  client: {
    name: string;
    company: string;
    phone: string;
    email: string;
  };
  address: string;
  status: 'planning' | 'active' | 'on_hold' | 'done' | 'cancelled';
  startDate: string;
  dueDate?: string;
  budget?: number;
  tasksCount: number;
  tasksCompleted: number;
  manager: {
    id: string;
    name: string;
    initials: string;
  };
  team: {
    id: string;
    name: string;
    role: string;
    initials: string;
  }[];
  files: {
    id: string;
    name: string;
    type: 'image' | 'document' | 'spreadsheet';
    size: string;
    uploadDate: string;
    url: string;
  }[];
}

interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 1 | 2 | 3;
  dueDate?: string;
  projectId: string;
  projectTitle: string;
  assigneeName?: string;
  assigneeInitials?: string;
  messagesCount?: number;
  attachmentsCount?: number;
}

interface ProjectInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  supplier: string;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  total_amount: number;
}

// Временные данные
const mockProject: ProjectDetails = {
  id: '1',
  title: 'Жилой комплекс "Морской бриз"',
  description: 'Остекление фасадов и установка окон в жилом комплексе из 3 корпусов. Требуется установка энергосберегающих стеклопакетов с повышенной шумоизоляцией.',
  client: {
    name: 'Сергей Петров',
    company: 'ООО "СтройИнвест"',
    phone: '+7 (901) 123-45-67',
    email: 'petrov@stroyinvest.ru',
  },
  address: 'г. Москва, ул. Приморская, д. 15',
  status: 'active',
  startDate: '2025-08-15',
  dueDate: '2025-12-31',
  budget: 1250000,
  tasksCount: 12,
  tasksCompleted: 5,
  manager: {
    id: '1',
    name: 'Иванов И.И.',
    initials: 'ИИ',
  },
  team: [
    {
      id: '2',
      name: 'Петров П.П.',
      role: 'Замерщик',
      initials: 'ПП',
    },
    {
      id: '3',
      name: 'Сидоров С.С.',
      role: 'Монтажник',
      initials: 'СС',
    },
    {
      id: '4',
      name: 'Козлов К.К.',
      role: 'Монтажник',
      initials: 'КК',
    },
  ],
  files: [
    {
      id: '1',
      name: 'Договор.pdf',
      type: 'document',
      size: '2.3 MB',
      uploadDate: '2025-08-18',
      url: '/files/1',
    },
    {
      id: '2',
      name: 'Спецификация.xlsx',
      type: 'spreadsheet',
      size: '458 KB',
      uploadDate: '2025-08-20',
      url: '/files/2',
    },
    {
      id: '3',
      name: 'Фасад.jpg',
      type: 'image',
      size: '1.2 MB',
      uploadDate: '2025-08-22',
      url: '/files/3',
    },
    {
      id: '4',
      name: 'Замеры.pdf',
      type: 'document',
      size: '3.5 MB',
      uploadDate: '2025-09-05',
      url: '/files/4',
    },
  ],
};

const mockTasks: ProjectTask[] = [
  {
    id: '1',
    title: 'Замер окон на объекте',
    description: 'Выполнить замер всех окон в корпусе А, подготовить чертежи и спецификацию',
    status: 'in_progress',
    priority: 2,
    dueDate: '2025-10-05',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    assigneeName: 'Петров П.П.',
    assigneeInitials: 'ПП',
    messagesCount: 3,
    attachmentsCount: 2,
  },
  {
    id: '4',
    title: 'Подготовка монтажной бригады',
    description: 'Сформировать бригаду, подготовить инструменты и материалы',
    status: 'todo',
    priority: 2,
    dueDate: '2025-10-10',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    assigneeName: undefined,
    assigneeInitials: undefined,
    messagesCount: 0,
    attachmentsCount: 0,
  },
  {
    id: '5',
    title: 'Заказ материалов',
    description: 'Заказать стеклопакеты, профиль и фурнитуру согласно спецификации',
    status: 'done',
    priority: 1,
    dueDate: '2025-09-15',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    assigneeName: 'Иванов И.И.',
    assigneeInitials: 'ИИ',
    messagesCount: 2,
    attachmentsCount: 1,
  },
];
    messagesCount: 2,
    attachmentsCount: 1,
  },
];

const mockInvoices: ProjectInvoice[] = [
  {
    id: '1',
    invoice_number: 'ИН-2025-001',
    issue_date: '2025-08-20',
    due_date: '2025-09-10',
    supplier: 'ООО "СтеклоПром"',
    status: 'paid',
    total_amount: 320000
  },
  {
    id: '2',
    invoice_number: 'ИН-2025-002',
    issue_date: '2025-09-05',
    due_date: '2025-09-25',
    supplier: 'ООО "ПрофильМастер"',
    status: 'pending',
    total_amount: 184500
  },
  {
    id: '3',
    invoice_number: 'ИН-2025-003',
    issue_date: '2025-09-15',
    supplier: 'ИП Сидоров А.В.',
    status: 'draft',
    total_amount: 76000
  }
];
    messagesCount: 2,
    attachmentsCount: 1,
  },
];

const statusMap = {
  planning: { label: 'Планирование', color: 'bg-purple-100 text-purple-800' },
  active: { label: 'Активен', color: 'bg-green-100 text-green-800' },
  on_hold: { label: 'На паузе', color: 'bg-yellow-100 text-yellow-800' },
  done: { label: 'Завершен', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Отменен', color: 'bg-red-100 text-red-800' },
};

export default function ProjectPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'invoices' | 'files' | 'team' | 'chat'>('overview');
  
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

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center">
          <Link href="/" className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{mockProject.title}</h1>
            <div className="flex items-center mt-1">
              <span className={`text-xs px-2.5 py-1 rounded-full ${statusMap[mockProject.status].color}`}>
                {statusMap[mockProject.status].label}
              </span>
              
              <span className="mx-2 text-gray-300">•</span>
              
              <span className="text-sm text-gray-500">
                Создан {formatDate(mockProject.startDate)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
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
        <nav className="flex -mb-px space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Обзор
          </button>
          
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-4 px-1 text-sm font-medium border-b-2 flex items-center ${
              activeTab === 'tasks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Задачи
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {mockProject.tasksCount}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-4 px-1 text-sm font-medium border-b-2 flex items-center ${
              activeTab === 'invoices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Счета
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
              0
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
              {mockProject.files.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('team')}
            className={`py-4 px-1 text-sm font-medium border-b-2 flex items-center ${
              activeTab === 'team'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Команда
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {mockProject.team.length + 1}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-4 px-1 text-sm font-medium border-b-2 flex items-center ${
              activeTab === 'chat'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Чат
          </button>
        </nav>
      </div>
      
      {/* Содержимое вкладки Обзор */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Общая информация */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">О проекте</h2>
              
              <p className="text-gray-700 mb-6">{mockProject.description}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Информация о проекте</h3>
                  
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Calendar size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Дата начала</p>
                        <p className="text-sm text-gray-900">{formatDate(mockProject.startDate)}</p>
                      </div>
                    </li>
                    
                    {mockProject.dueDate && (
                      <li className="flex items-start">
                        <Clock size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Дата завершения</p>
                          <p className="text-sm text-gray-900">{formatDate(mockProject.dueDate)}</p>
                        </div>
                      </li>
                    )}
                    
                    {mockProject.budget && (
                      <li className="flex items-start">
                        <FileText size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Бюджет</p>
                          <p className="text-sm text-gray-900">{formatCurrency(mockProject.budget)}</p>
                        </div>
                      </li>
                    )}
                    
                    <li className="flex items-start">
                      <MapPin size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Адрес</p>
                        <p className="text-sm text-gray-900">{mockProject.address}</p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <User size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Менеджер проекта</p>
                        <p className="text-sm text-gray-900">{mockProject.manager.name}</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Информация о клиенте</h3>
                  
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <User size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Контактное лицо</p>
                        <p className="text-sm text-gray-900">{mockProject.client.name}</p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <Building size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Компания</p>
                        <p className="text-sm text-gray-900">{mockProject.client.company}</p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <Phone size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Телефон</p>
                        <p className="text-sm text-gray-900">{mockProject.client.phone}</p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <Mail size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm text-gray-900">{mockProject.client.email}</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Последние задачи */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Последние задачи</h2>
                
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Показать все
                </button>
              </div>
              
              <div className="space-y-3">
                {mockTasks.slice(0, 3).map(task => (
                  <TaskCard key={task.id} {...task} />
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <Link
                  href={`/projects/${mockProject.id}/tasks/new`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
                >
                  <Plus size={16} className="mr-2" />
                  Новая задача
                </Link>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Прогресс */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Прогресс проекта</h2>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Выполнение задач</span>
                  <span className="font-medium">
                    {mockProject.tasksCompleted}/{mockProject.tasksCount} ({Math.round((mockProject.tasksCompleted / mockProject.tasksCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${(mockProject.tasksCompleted / mockProject.tasksCount) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">К выполнению</p>
                  <p className="text-xl font-medium text-gray-900">
                    {mockProject.tasksCount - mockProject.tasksCompleted}
                  </p>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Завершено</p>
                  <p className="text-xl font-medium text-blue-700">
                    {mockProject.tasksCompleted}
                  </p>
                </div>
              </div>
              
              <div className="text-center">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Gauge size={16} className="mr-2" />
                  Подробная статистика
                </button>
              </div>
            </div>
            
            {/* Команда */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Команда проекта</h2>
                
                <button
                  type="button"
                  onClick={() => setActiveTab('team')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Показать всех
                </button>
              </div>
              
              <ul className="divide-y divide-gray-200">
                <li className="py-3 flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                      {mockProject.manager.initials}
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{mockProject.manager.name}</p>
                    <p className="text-xs text-gray-500">Менеджер проекта</p>
                  </div>
                </li>
                
                {mockProject.team.slice(0, 3).map(member => (
                  <li key={member.id} className="py-3 flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm">
                        {member.initials}
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Plus size={16} className="mr-2" />
                  Добавить участника
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Содержимое вкладки Задачи */}
      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Задачи проекта</h2>
            
            <Link
              href={`/projects/${mockProject.id}/tasks/new`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            >
              <Plus size={16} className="mr-2" />
              Новая задача
            </Link>
          </div>
          
          <div className="space-y-4">
            {mockTasks.map(task => (
              <TaskCard key={task.id} {...task} />
            ))}
          </div>
        </div>
      )}
      
      {/* Содержимое вкладки Счета */}
      {activeTab === 'invoices' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Счета проекта</h2>
            
            <Link
              href={`/projects/${mockProject.id}/invoices/new`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            >
              <Plus size={16} className="mr-2" />
              Новый счет
            </Link>
          </div>
          
          {mockInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Номер счета
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Поставщик
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockInvoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.supplier}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(invoice.issue_date)}
                          {invoice.due_date && (
                            <div className="text-xs text-gray-400">
                              До: {formatDate(invoice.due_date)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                          ${invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' : ''}
                          ${invoice.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {invoice.status === 'paid' && 'Оплачен'}
                          {invoice.status === 'pending' && 'Ожидает оплаты'}
                          {invoice.status === 'draft' && 'Черновик'}
                          {invoice.status === 'cancelled' && 'Отменен'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Еще нет добавленных счетов</p>
              <Link
                href={`/projects/${mockProject.id}/invoices/new`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
              >
                <Plus size={16} className="mr-2" />
                Добавить первый счет
              </Link>
            </div>
          )}
        </div>
      )}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Файлы проекта</h2>
            
            <div className="flex space-x-2">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <FileUp size={16} className="mr-2" />
                Загрузить
              </button>
              
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
              >
                <Plus size={16} className="mr-2" />
                Создать папку
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Имя
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
                {mockProject.files.map(file => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                          {file.type === 'document' && <FileText size={24} className="text-blue-500" />}
                          {file.type === 'spreadsheet' && <FileBox size={24} className="text-green-500" />}
                          {file.type === 'image' && <ImageIcon size={24} className="text-purple-500" />}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(file.uploadDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{file.size}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Содержимое вкладки Команда */}
      {activeTab === 'team' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Команда проекта</h2>
            
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            >
              <Plus size={16} className="mr-2" />
              Добавить участника
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    {mockProject.manager.initials}
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{mockProject.manager.name}</h3>
                  <p className="text-sm text-blue-600">Менеджер проекта</p>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800 mr-3"
                >
                  Написать
                </button>
              </div>
            </div>
            
            {mockProject.team.map(member => (
              <div key={member.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-500 flex items-center justify-center text-white">
                      {member.initials}
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-600">{member.role}</p>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Написать
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}