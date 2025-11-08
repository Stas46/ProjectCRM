'use client';

import AppLayout from '@/components/app-layout';
import TaskCard from '@/components/task-card';
import TaskFilters from '@/components/task-filters';
import { Plus, ArrowDownUp, LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';

// Временные данные для демонстрации
const mockTasks = [
  {
    id: '1',
    title: 'Замер окон на объекте "Морской бриз"',
    description: 'Выполнить замер всех окон в корпусе А, подготовить чертежи и спецификацию',
    status: 'in_progress' as const,
    priority: 2 as const,
    dueDate: '2025-10-05',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    assigneeName: 'Иванов И.И.',
    assigneeInitials: 'ИИ',
    messagesCount: 3,
    attachmentsCount: 2,
  },
  {
    id: '2',
    title: 'Заказ материалов для коттеджа Иванова',
    description: 'Сформировать заказ на профиль, стеклопакеты и фурнитуру',
    status: 'todo' as const,
    priority: 1 as const,
    dueDate: '2025-09-30',
    projectId: '2',
    projectTitle: 'Коттедж Иванова',
    assigneeName: 'Петров П.П.',
    assigneeInitials: 'ПП',
    messagesCount: 0,
    attachmentsCount: 1,
  },
  {
    id: '3',
    title: 'Согласование проекта офисного центра',
    description: 'Согласовать проект остекления с архитектором и заказчиком',
    status: 'blocked' as const,
    priority: 1 as const,
    dueDate: '2025-09-25',
    projectId: '3',
    projectTitle: 'Офисный центр "Горизонт"',
    assigneeName: 'Сидоров С.С.',
    assigneeInitials: 'СС',
    messagesCount: 5,
    attachmentsCount: 3,
  },
  {
    id: '4',
    title: 'Подготовка монтажной бригады',
    description: 'Сформировать бригаду, подготовить инструменты и материалы',
    status: 'todo' as const,
    priority: 2 as const,
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
    title: 'Финальная проверка монтажа',
    description: 'Проверить качество установки, оформить акт приема-передачи',
    status: 'done' as const,
    priority: 2 as const,
    dueDate: '2025-09-20',
    projectId: '4',
    projectTitle: 'Ресторан "Панорама"',
    assigneeName: 'Иванов И.И.',
    assigneeInitials: 'ИИ',
    messagesCount: 2,
    attachmentsCount: 4,
  },
];

export default function TasksPage() {
  const [filters, setFilters] = useState({ 
    search: '', 
    status: [] as string[],
    priority: [] as number[],
    assignee: [] as string[],
  });
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const filteredTasks = mockTasks.filter(task => {
    // Apply search filter
    const matchesSearch = !filters.search || 
      task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      (task.description?.toLowerCase().includes(filters.search.toLowerCase()) ?? false) ||
      task.projectTitle.toLowerCase().includes(filters.search.toLowerCase());
    
    // Apply status filter
    const matchesStatus = filters.status.length === 0 || 
      filters.status.includes(task.status);
    
    // Apply priority filter
    const matchesPriority = filters.priority.length === 0 || 
      filters.priority.includes(task.priority);
    
    // Apply assignee filter
    const matchesAssignee = filters.assignee.length === 0 || 
      (task.assigneeName 
        ? filters.assignee.some(a => task.assigneeName?.includes(a))
        : false);
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  }).sort((a, b) => {
    // Sort by due date
    if (a.dueDate && b.dueDate) {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Задачи</h1>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
          >
            <Plus size={20} className="mr-2" />
            Новая задача
          </button>
        </div>
      
        <TaskFilters onFilterChange={setFilters} />
      
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-500">
            {filteredTasks.length} {getTaskCountText(filteredTasks.length)}
          </div>
        
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              title="Сортировка по дате"
            >
              <ArrowDownUp size={18} className={sortOrder === 'desc' ? 'transform rotate-180' : ''} />
            </button>
          
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 hover:bg-gray-100 rounded-md ${viewMode === 'grid' ? 'text-blue-600' : 'text-gray-500'}`}
              title="Сетка"
            >
              <LayoutGrid size={18} />
            </button>
          
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 hover:bg-gray-100 rounded-md ${viewMode === 'list' ? 'text-blue-600' : 'text-gray-500'}`}
              title="Список"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Задачи не найдены</h3>
            <p className="text-gray-500">
              Попробуйте изменить параметры фильтрации или создайте новую задачу
            </p>
          </div>
        ) : (
          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
              : 'space-y-3'
            }
          `}>
            {filteredTasks.map(task => (
              <TaskCard key={task.id} {...task} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function getTaskCountText(count: number): string {
  if (count === 0) return 'задач';
  if (count === 1) return 'задача';
  if (count >= 2 && count <= 4) return 'задачи';
  return 'задач';
}