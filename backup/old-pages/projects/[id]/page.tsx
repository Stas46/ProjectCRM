'use client';

import AppLayout from '@/components/app-layout';
import TaskCard from '@/components/task-card';
import SimpleInvoiceUpload from '@/components/simple-invoice-upload';
import InvoiceEdit from '@/components/invoice-edit';
import ExpenseProgressBar from '@/components/expense-progress-bar';
import { expenseCategoryMap, ExpenseCategory } from '@/types/supplier';
import { Button } from '@/components/ui/button';
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
  FileBox,
  Send,
  Paperclip,
  Upload,
  Eye,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { mockMessages } from './mock-messages';

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
  supplier_id?: string;
  supplier_name: string;
  supplier_inn?: string;
  status: 'draft' | 'to_pay' | 'paid' | 'rejected';
  total_amount: number;
  vat_amount?: number;
  has_vat?: boolean;
  category: string;
  description?: string;
  file_url?: string;
  original_file_name?: string;
  created_at: string;
  updated_at?: string;
  project_id: string;
}

interface ProjectMessage {
  id: string;
  user: {
    id: string;
    name: string;
    initials: string;
    avatar?: string;
  };
  content: string;
  created_at: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: string;
    url: string;
  }[];
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

// Закомментировано, поскольку счета теперь загружаются из базы данных
// const mockInvoices: ProjectInvoice[] = [
//   {
//     id: '1',
//     invoice_number: 'ИН-2025-001',
//     issue_date: '2025-08-20',
//     due_date: '2025-09-10',
//     supplier: 'ООО "СтеклоПром"',
//     status: 'paid',
//     total_amount: 320000
//   },
//   {
//     id: '2',
//     invoice_number: 'ИН-2025-002',
//     issue_date: '2025-09-05',
//     due_date: '2025-09-25',
//     supplier: 'ООО "ПрофильМастер"',
//     status: 'pending',
//     total_amount: 184500
//   },
//   {
//     id: '3',
//     invoice_number: 'ИН-2025-003',
//     issue_date: '2025-09-15',
//     supplier: 'ИП Сидоров А.В.',
//     status: 'draft',
//     total_amount: 76000
//   }
// ];

const statusMap = {
  planning: { label: 'Планирование', color: 'bg-purple-100 text-purple-800' },
  active: { label: 'Активен', color: 'bg-green-100 text-green-800' },
  on_hold: { label: 'На паузе', color: 'bg-yellow-100 text-yellow-800' },
  done: { label: 'Завершен', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Отменен', color: 'bg-red-100 text-red-800' },
};

export default function ProjectPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'invoices' | 'files' | 'team' | 'chat'>('overview');
  const [newMessage, setNewMessage] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  
  // Состояния для загрузки проекта
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  
  // Состояния для работы со счетами
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ProjectInvoice | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Ключ для принудительного обновления ExpenseProgressBar
  
  // Загрузка проекта при монтировании
  useEffect(() => {
    loadProject();
  }, [id]);
  
  const loadProject = async () => {
    setIsLoadingProject(true);
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.project) {
          console.log('📋 [DEBUG] Данные проекта из API:', data.project);
          
          // Преобразуем данные из API в формат ProjectDetails
          const projectData: ProjectDetails = {
            id: data.project.id,
            title: data.project.title,
            description: data.project.description || '',
            client: {
              name: data.project.client?.contact_person || 'Не указано',
              company: data.project.client?.name || 'Не указано',
              phone: data.project.client?.phone || '',
              email: data.project.client?.email || '',
            },
            address: data.project.address || '',
            status: data.project.status || 'planning',
            startDate: data.project.start_date || '',
            dueDate: data.project.end_date,
            budget: data.project.budget,
            tasksCount: data.project.tasks_count || 0,
            tasksCompleted: data.project.tasks_completed || 0,
            manager: data.project.manager || {
              id: '0',
              name: 'Не назначен',
              initials: '--',
            },
            team: data.project.team || [],
            files: data.project.files || [],
          };
          
          setProject(projectData);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки проекта:', error);
    } finally {
      setIsLoadingProject(false);
    }
  };
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'tasks', 'invoices', 'files', 'team', 'chat'].includes(tab)) {
      setActiveTab(tab as any);
    }
    
    // Загружаем проект при монтировании
    loadProject();
  }, [searchParams, id]);

  // Загрузка счетов при монтировании компонента или изменении activeTab
  useEffect(() => {
    if (activeTab === 'invoices') {
      loadInvoices();
    }
  }, [activeTab, id]);

  const loadInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const response = await fetch(`/api/projects/${id}/invoices`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('📋 [DEBUG] Данные счетов из API:', data.invoices);
          
          // Используем реальные данные из API, даже если их нет
          const invoicesToShow = data.invoices || [];
          
          // Преобразуем данные из БД в формат ProjectInvoice
          const formattedInvoices: ProjectInvoice[] = invoicesToShow.map((invoice: any) => {
            console.log('📋 [DEBUG] Обрабатываем счет:', {
              id: invoice.id,
              invoice_number: invoice.invoice_number,
              supplier_id: invoice.supplier_id,
              supplier_name: invoice.supplier_name,
              total_amount: invoice.total_amount,
              total_amount_type: typeof invoice.total_amount
            });
            
            return {
              id: invoice.id,
              // Используем правильные названия полей из реальной схемы БД
              supplier_id: invoice.supplier_id,
              supplier_name: invoice.supplier_name || 'Неизвестный поставщик',
              supplier_inn: invoice.supplier_inn,
              invoice_number: invoice.invoice_number || 'Без номера',
              issue_date: invoice.issue_date,
              due_date: invoice.due_date,
              total_amount: invoice.total_amount || 0,
              vat_amount: invoice.vat_amount || 0,
              has_vat: invoice.has_vat || false,
              status: invoice.status || 'draft',
              category: invoice.category ? (expenseCategoryMap[invoice.category as ExpenseCategory] || invoice.category) : 'Без категории',
              description: invoice.description,
              file_url: invoice.file_url,
              original_file_name: invoice.original_file_name,
              created_at: invoice.created_at,
              updated_at: invoice.updated_at,
              project_id: invoice.project_id
            };
          });
          console.log('📋 [DEBUG] Отформатированные счета:', formattedInvoices);
          setInvoices(formattedInvoices);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки счетов:', error);
    } finally {
      setIsLoadingInvoices(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch (error) {
      return 'Неверная дата';
    }
  };
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  const formatCurrency = (amount: number | string | null | undefined) => {
    // Преобразуем в число
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (numAmount === undefined || numAmount === null || isNaN(numAmount) || numAmount === 0) {
      return '0 ₽';
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  // Добавление нового счета
  const handleInvoiceAdded = () => {
    console.log('📋 [PAGE] Счет добавлен, перезагружаем список');
    loadInvoices(); // Перезагружаем счета из базы данных
    // НЕ закрываем форму автоматически - пусть пользователь сам решает
    setRefreshKey(prev => prev + 1); // Обновляем ExpenseProgressBar
  };

  // Удаление счета
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот счет?')) {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
          setRefreshKey(prev => prev + 1); // Обновляем ExpenseProgressBar
        } else {
          alert('Ошибка при удалении счета');
        }
      } catch (error) {
        console.error('Ошибка удаления счета:', error);
        alert('Ошибка при удалении счета');
      }
    }
  };

  // Редактирование счета
  const handleEditInvoice = (invoice: ProjectInvoice) => {
    setEditingInvoice(invoice);
  };

  // Сохранение изменений счета
  const handleSaveInvoice = (updatedInvoice: ProjectInvoice) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === updatedInvoice.id ? updatedInvoice : inv
    ));
    setEditingInvoice(null);
  };

  // Если проект загружается, показываем индикатор
  if (isLoadingProject) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  // Если проект не найден
  if (!project) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Проект не найден</h2>
            <p className="text-gray-600 mb-4">Проект с указанным ID не существует</p>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Вернуться к списку проектов
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center">
          <Link href="/" className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <div className="flex items-center mt-1">
              <span className={`text-xs px-2.5 py-1 rounded-full ${statusMap[project.status].color}`}>
                {statusMap[project.status].label}
              </span>
              
              <span className="mx-2 text-gray-300">•</span>
              
              <span className="text-sm text-gray-500">
                Создан {formatDate(project.startDate)}
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
              {project.tasksCount}
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
              {invoices.length}
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
              {project.files.length}
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
              {project.team.length + 1}
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">О проекте</h2>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDescription(!showDescription)}
                >
                  {showDescription ? 'Скрыть описание' : 'Показать описание'}
                </Button>
              </div>
              
              {showDescription && (
                <p className="text-gray-700 mb-6">{mockProject.description}</p>
              )}
              
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
                    
                    {project.budget && (
                      <li className="flex items-start">
                        <FileText size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Бюджет</p>
                          <p className="text-sm text-gray-900">{formatCurrency(project.budget)}</p>
                        </div>
                      </li>
                    )}
                    
                    <li className="flex items-start">
                      <MapPin size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Адрес</p>
                        <p className="text-sm text-gray-900">{project.address}</p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <User size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Менеджер проекта</p>
                        <p className="text-sm text-gray-900">{project.manager.name}</p>
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
                        <p className="text-sm text-gray-900">{project.client.name}</p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <Building size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Компания</p>
                        <p className="text-sm text-gray-900">{project.client.company}</p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <Phone size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Телефон</p>
                        <p className="text-sm text-gray-900">{project.client.phone}</p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <Mail size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm text-gray-900">{project.client.email}</p>
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
                  href={`/projects/${project.id}/tasks/new`}
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
                    {project.tasksCompleted}/{project.tasksCount} ({Math.round((project.tasksCompleted / project.tasksCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${(project.tasksCompleted / project.tasksCount) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">К выполнению</p>
                  <p className="text-xl font-medium text-gray-900">
                    {project.tasksCount - project.tasksCompleted}
                  </p>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Завершено</p>
                  <p className="text-xl font-medium text-blue-700">
                    {project.tasksCompleted}
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
                      {project.manager.initials}
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{project.manager.name}</p>
                    <p className="text-xs text-gray-500">Менеджер проекта</p>
                  </div>
                </li>
                
                {project.team.slice(0, 3).map(member => (
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
            
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowUploadForm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload size={16} className="mr-2" />
                Загрузить счет
              </Button>
              
              <Link
                href={`/projects/${mockProject.id}/invoices/new`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
              >
                <Plus size={16} className="mr-2" />
                Новый счет
              </Link>
            </div>
          </div>
          
          {/* Прогресс затрат по категориям */}
          <ExpenseProgressBar key={refreshKey} projectId={id as string} />
          
          {/* Форма загрузки счета */}
          {showUploadForm && (
            <SimpleInvoiceUpload
              projectId={id as string}
              onInvoiceAdded={handleInvoiceAdded}
              onClose={() => setShowUploadForm(false)}
            />
          )}
          
          {isLoadingInvoices ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Загрузка счетов...</span>
            </div>
          ) : invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Счет
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Поставщик
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Категория
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number || 'Без номера'}
                            </div>
                            {invoice.file_url && (
                              <span 
                                className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                  invoice.supplier_name === 'Тестовая компания' 
                                    ? 'bg-orange-100 text-orange-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`} 
                                title={
                                  invoice.supplier_name === 'Тестовая компания' 
                                    ? 'Демо данные (Google Vision API недоступен)' 
                                    : 'Автоматически распознан через AI'
                                }
                              >
                                {invoice.supplier_name === 'Тестовая компания' ? 'ДЕМО' : 'AI'}
                              </span>
                            )}
                          </div>
                          {invoice.file_url && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <FileText size={12} className="mr-1 flex-shrink-0" />
                              <span className="truncate max-w-xs" title="Исходный файл прикреплен">
                                Файл прикреплен
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm text-gray-900 font-medium">
                            {invoice.supplier_name || 'Не указан'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {invoice.category}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.issue_date)}
                          </div>
                          {invoice.due_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              До: {formatDate(invoice.due_date)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${invoice.category === 'Профили' ? 'bg-blue-100 text-blue-800' : ''}
                          ${invoice.category === 'Материалы' ? 'bg-green-100 text-green-800' : ''}
                          ${invoice.category === 'Услуги' ? 'bg-purple-100 text-purple-800' : ''}
                          ${invoice.category === 'Оборудование' ? 'bg-orange-100 text-orange-800' : ''}
                          ${invoice.category === 'Транспорт' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${invoice.category === 'Доп. затраты' ? 'bg-red-100 text-red-800' : ''}
                          ${!invoice.category || invoice.category === 'Прочее' ? 'bg-gray-100 text-gray-800' : ''}
                        `}>
                          {invoice.category || 'Прочее'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.total_amount)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            с НДС
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {invoice.file_url && (
                          <button
                            type="button"
                            className="text-gray-600 hover:text-gray-900 mr-3"
                            title="Открыть исходный файл"
                            onClick={() => {
                              // Если file_url уже начинается с /api/files/, используем как есть
                              // Иначе добавляем префикс
                              const fileUrl = invoice.file_url?.startsWith('/api/files/') 
                                ? invoice.file_url 
                                : `/api/files/${invoice.file_url}`;
                              window.open(fileUrl, '_blank');
                            }}
                          >
                            <Eye size={18} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Редактировать счет"
                          onClick={() => handleEditInvoice(invoice)}
                        >
                          <Edit size={18} />
                        </button>

                        <button
                          type="button"
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Строка с общей суммой */}
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900" colSpan={4}>
                      Общая сумма по проекту:
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0))}
                      </div>
                      <div className="text-xs text-gray-500">
                        {invoices.length} счет(ов)
                      </div>
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Еще нет добавленных счетов</p>
              <Link
                href={`/projects/${project.id}/invoices/new`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
              >
                <Plus size={16} className="mr-2" />
                Добавить первый счет
              </Link>
            </div>
          )}
        </div>
      )}
      
      {/* Содержимое вкладки Файлы */}
      {activeTab === 'files' && (
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
                {project.files.map(file => (
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
                    {project.manager.initials}
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{project.manager.name}</h3>
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
            
            {project.team.map(member => (
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
      
      {/* Содержимое вкладки Чат */}
      {activeTab === 'chat' && (
        <div className="bg-white h-[calc(100vh-220px)] flex flex-col rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Чат проекта</h2>
            
            <Link
              href={`/projects/${project.id}/chat/new`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            >
              <Plus size={16} className="mr-2" />
              Новое сообщение
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {mockMessages.map((message) => (
              <div key={message.id} className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm">
                    {message.user.initials}
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900">{message.user.name}</p>
                    <span className="ml-2 text-xs text-gray-500">{formatDateTime(message.created_at)}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    <p>{message.content}</p>
                  </div>
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Вложения:</p>
                      <ul className="space-y-1">
                        {message.attachments.map((attachment) => (
                          <li key={attachment.id} className="flex items-center text-sm">
                            <Paperclip size={14} className="text-gray-400 mr-1" />
                            <a
                              href={attachment.url}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {attachment.name} ({attachment.size})
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение..."
                className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                rows={2}
              />
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 h-full bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Send size={16} />
              </button>
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <div>
                <button
                  type="button"
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <Paperclip size={16} className="mr-1" />
                  Прикрепить файл
                </button>
              </div>
              
              <Link
                href={`/projects/${mockProject.id}/chat/new`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Расширенный режим
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования счета */}
      {editingInvoice && (
        <InvoiceEdit
          invoice={editingInvoice}
          onSave={handleSaveInvoice}
          onCancel={() => setEditingInvoice(null)}
        />
      )}

    </AppLayout>
  );
}