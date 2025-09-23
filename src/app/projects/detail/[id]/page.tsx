'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building, MapPin, Calendar, Clock, AlertCircle, FileText } from 'lucide-react';
import AppLayout from '@/components/app-layout';
import { getProjectById } from '@/services/projects';
import { Project } from '@/types/project';
import { getProjectTasks } from '@/services/tasks';
import { Task } from '@/types/task';
import { getProjectInvoices } from '@/services/invoices';
import { Invoice } from '@/types/invoice';
import { getProjectShifts } from '@/services/shifts';
import { Shift } from '@/types/shift';

interface ProjectDetailPageProps {
  params: {
    id: string;
  };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = params;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);
        
        if (!id) {
          throw new Error('ID проекта не указан');
        }
        
        // Загрузка данных проекта
        const projectData = await getProjectById(id);
        if (!projectData) {
          throw new Error('Проект не найден');
        }
        
        setProject(projectData);
        
        // Загрузка задач проекта
        const tasksData = await getProjectTasks(id);
        setTasks(tasksData);
        
        // Загрузка счетов проекта
        const invoicesData = await getProjectInvoices(id);
        setInvoices(invoicesData);
        
        // Загрузка смен проекта
        const shiftsData = await getProjectShifts(id);
        setShifts(shiftsData);
        
        setError(null);
      } catch (err: any) {
        console.error('Ошибка при загрузке данных проекта:', err);
        setError(err.message || 'Не удалось загрузить данные проекта');
      } finally {
        setLoading(false);
      }
    };
    
    loadProjectData();
  }, [id]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };
  
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string, color: string }> = {
      planning: { label: 'Планирование', color: 'bg-purple-100 text-purple-800' },
      active: { label: 'Активен', color: 'bg-green-100 text-green-800' },
      on_hold: { label: 'На паузе', color: 'bg-yellow-100 text-yellow-800' },
      done: { label: 'Завершен', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Отменен', color: 'bg-red-100 text-red-800' },
    };
    
    return statusMap[status] || { label: 'Неизвестно', color: 'bg-gray-100 text-gray-800' };
  };
  
  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AppLayout>
    );
  }
  
  if (error || !project) {
    return (
      <AppLayout>
        <div className="p-4">
          <div className="flex items-center mb-6">
            <Link href="/projects" className="text-gray-500 hover:text-blue-600">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 ml-4">Ошибка</h1>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h2 className="text-lg font-medium text-red-800 mb-2">Произошла ошибка</h2>
            <p className="text-red-700">{error || 'Не удалось загрузить проект'}</p>
            <Link href="/projects" className="mt-4 inline-block text-blue-600 hover:underline">
              Вернуться к списку проектов
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  const statusInfo = getStatusInfo(project.status);
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const totalInvoicesAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  
  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex items-center mb-6">
          <Link href="/projects" className="text-gray-500 hover:text-blue-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 ml-4">{project.title}</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Основная информация */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Информация о проекте</h2>
              </div>
              
              <div className="p-4">
                <div className="flex items-start mb-4">
                  <div className="w-8 h-8 flex items-center justify-center mr-3 mt-0.5">
                    <Building size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Заказчик</div>
                    <div className="font-medium">{project.client}</div>
                  </div>
                </div>
                
                <div className="flex items-start mb-4">
                  <div className="w-8 h-8 flex items-center justify-center mr-3 mt-0.5">
                    <MapPin size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Адрес</div>
                    <div className="font-medium">{project.address}</div>
                  </div>
                </div>
                
                <div className="flex items-start mb-4">
                  <div className="w-8 h-8 flex items-center justify-center mr-3 mt-0.5">
                    <Calendar size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Срок выполнения</div>
                    <div className="font-medium">{project.due_date ? formatDate(project.due_date) : 'Не указан'}</div>
                  </div>
                </div>
                
                <div className="flex items-start mb-4">
                  <div className="w-8 h-8 flex items-center justify-center mr-3 mt-0.5">
                    <Clock size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Бюджет</div>
                    <div className="font-medium">{project.budget ? formatCurrency(project.budget) : 'Не указан'}</div>
                  </div>
                </div>
                
                {project.description && (
                  <div className="mt-6">
                    <div className="text-sm text-gray-500 mb-1">Описание</div>
                    <div className="text-gray-700 whitespace-pre-line">{project.description}</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Прогресс проекта */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Прогресс</h2>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500">Выполнено задач</span>
                  <span className="font-medium">{completedTasks} из {tasks.length}</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <span className="text-gray-500">Статус проекта</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Последние задачи */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Задачи</h2>
                <Link href={`/projects/${project.id}/tasks`} className="text-sm text-blue-600 hover:underline">
                  Смотреть все
                </Link>
              </div>
              
              {tasks.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task.status === 'done' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'done' ? 'Выполнено' :
                           task.status === 'in_progress' ? 'В процессе' :
                           task.status === 'blocked' ? 'Заблокировано' :
                           'Ожидает'}
                        </span>
                      </div>
                      
                      {task.due_date && (
                        <div className="text-sm text-gray-500">
                          Срок: {formatDate(task.due_date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Задачи не найдены
                </div>
              )}
            </div>
          </div>
          
          {/* Боковая панель */}
          <div>
            {/* Финансы */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Финансы</h2>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-500">Бюджет</span>
                  <span className="font-medium">{project.budget ? formatCurrency(project.budget) : 'Не указан'}</span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-500">Расходы</span>
                  <span className="font-medium">{formatCurrency(totalInvoicesAmount)}</span>
                </div>
                
                {project.budget && (
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-500">Остаток</span>
                    <span className={`font-medium ${project.budget - totalInvoicesAmount < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(project.budget - totalInvoicesAmount)}
                    </span>
                  </div>
                )}
                
                <div className="mt-4">
                  <Link 
                    href={`/projects/${project.id}/invoices`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Просмотреть все счета ({invoices.length})
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Ближайшие смены */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Ближайшие смены</h2>
              </div>
              
              {shifts.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {shifts.slice(0, 3).map((shift) => (
                    <div key={shift.id} className="p-4 hover:bg-gray-50">
                      <h3 className="font-medium text-gray-900 mb-1">{shift.title}</h3>
                      
                      <div className="text-sm text-gray-500 mb-1">
                        {new Date(shift.start_time).toLocaleString('ru-RU')} - 
                        {new Date(shift.end_time).toLocaleTimeString('ru-RU')}
                      </div>
                      
                      {shift.location && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {shift.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Смены не найдены
                </div>
              )}
              
              <div className="p-4 border-t border-gray-200">
                <Link 
                  href={`/projects/${project.id}/schedule`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Посмотреть расписание
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}