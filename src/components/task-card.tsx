'use client';

import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  User, 
  MoreVertical,
  MessageSquare,
  Paperclip
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 1 | 2 | 3; // 1-high, 2-normal, 3-low
  dueDate?: string;
  projectId: string;
  projectTitle: string;
  assigneeName?: string;
  assigneeInitials?: string;
  messagesCount?: number;
  attachmentsCount?: number;
}

const statusMap = {
  todo: { 
    label: 'К выполнению', 
    icon: Clock, 
    color: 'text-gray-500 bg-gray-100' 
  },
  in_progress: { 
    label: 'В работе', 
    icon: AlertCircle, 
    color: 'text-blue-600 bg-blue-100' 
  },
  blocked: { 
    label: 'Блокировано', 
    icon: AlertTriangle, 
    color: 'text-red-600 bg-red-100' 
  },
  review: { 
    label: 'На проверке', 
    icon: AlertCircle, 
    color: 'text-yellow-600 bg-yellow-100' 
  },
  done: { 
    label: 'Выполнено', 
    icon: CheckCircle2, 
    color: 'text-green-600 bg-green-100' 
  },
};

const priorityMap = {
  1: { label: 'Высокий', color: 'text-red-600' },
  2: { label: 'Средний', color: 'text-blue-600' },
  3: { label: 'Низкий', color: 'text-gray-600' },
};

const TaskCard = ({
  id,
  title,
  description,
  status,
  priority,
  dueDate,
  projectId,
  projectTitle,
  assigneeName,
  assigneeInitials = 'Н',
  messagesCount = 0,
  attachmentsCount = 0,
}: TaskCardProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const statusInfo = statusMap[status];
  const priorityInfo = priorityMap[priority];
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).format(date);
  };

  const isOverdue = dueDate ? new Date(dueDate) < new Date() && status !== 'done' : false;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <span className={`flex items-center text-xs px-2.5 py-1 rounded-full ${statusInfo.color}`}>
              <StatusIcon size={14} className="mr-1" />
              {statusInfo.label}
            </span>
            
            <span className={`ml-2 text-xs ${priorityInfo.color}`}>
              {priorityInfo.label}
            </span>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <MoreVertical size={16} />
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Редактировать
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Изменить статус
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Удалить
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Title */}
        <Link href={`/tasks/${id}`}>
          <h3 className="font-medium text-gray-900 mb-2 hover:text-blue-600 transition-colors">
            {title}
          </h3>
        </Link>
        
        {/* Description */}
        {description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{description}</p>
        )}
        
        {/* Project */}
        <div className="mb-3">
          <Link 
            href={`/projects/${projectId}`}
            className="text-xs text-blue-600 hover:underline"
          >
            {projectTitle}
          </Link>
        </div>
        
        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center">
            {assigneeName ? (
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                  {assigneeInitials}
                </div>
                <span className="ml-2 text-xs text-gray-600">{assigneeName}</span>
              </div>
            ) : (
              <div className="flex items-center text-gray-400 text-xs">
                <User size={14} className="mr-1" />
                <span>Не назначено</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {dueDate && (
              <div className={`flex items-center text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                <Clock size={14} className="mr-1" />
                <span>{formatDate(dueDate)}</span>
              </div>
            )}
            
            {messagesCount > 0 && (
              <div className="flex items-center text-xs text-gray-500">
                <MessageSquare size={14} className="mr-1" />
                <span>{messagesCount}</span>
              </div>
            )}
            
            {attachmentsCount > 0 && (
              <div className="flex items-center text-xs text-gray-500">
                <Paperclip size={14} className="mr-1" />
                <span>{attachmentsCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;