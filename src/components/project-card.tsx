'use client';

import { ChevronRight, AlertCircle, Clock, CalendarClock } from 'lucide-react';
import Link from 'next/link';

export interface ProjectCardProps {
  id: string;
  title: string;
  client: string;
  address: string;
  status: 'planning' | 'active' | 'on_hold' | 'done' | 'cancelled';
  dueDate?: string;
  budget?: number;
  tasksCount?: number;
  tasksCompleted?: number;
}

const statusMap = {
  planning: { label: 'Планирование', color: 'bg-purple-100 text-purple-800' },
  active: { label: 'Активен', color: 'bg-green-100 text-green-800' },
  on_hold: { label: 'На паузе', color: 'bg-yellow-100 text-yellow-800' },
  done: { label: 'Завершен', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Отменен', color: 'bg-red-100 text-red-800' },
};

const ProjectCard = ({
  id,
  title,
  client,
  address,
  status,
  dueDate,
  budget,
  tasksCount = 0,
  tasksCompleted = 0,
}: ProjectCardProps) => {
  const statusInfo = statusMap[status];
  const progress = tasksCount > 0 ? Math.round((tasksCompleted / tasksCount) * 100) : 0;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Link href={`/projects/${id}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-gray-900 text-lg line-clamp-1">{title}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          
          <div className="text-sm text-gray-500 mb-4">
            <div className="line-clamp-1 mb-1">{client}</div>
            <div className="line-clamp-1">{address}</div>
          </div>
          
          {/* Progress bar */}
          {tasksCount > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Прогресс</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 text-xs">
            {dueDate && (
              <div className="flex items-center text-gray-500">
                <CalendarClock size={14} className="mr-1" />
                <span>До {new Date(dueDate).toLocaleDateString('ru-RU')}</span>
              </div>
            )}
            
            {budget !== undefined && (
              <div className="flex items-center text-gray-500">
                <Clock size={14} className="mr-1" />
                <span>{formatCurrency(budget)}</span>
              </div>
            )}
            
            {tasksCount > 0 && (
              <div className="flex items-center text-gray-500">
                <AlertCircle size={14} className="mr-1" />
                <span>{tasksCompleted}/{tasksCount} задач</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-700">Подробнее</span>
          <ChevronRight size={16} className="text-gray-400" />
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;