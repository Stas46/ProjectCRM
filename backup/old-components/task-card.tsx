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
      <div className="p-3">
        {/* Header - Compact Layout */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <div className="flex items-center mb-1">
              <span className={`flex items-center text-xs px-2 py-0.5 rounded-full ${statusInfo.color} mr-2`}>
                <StatusIcon size={12} className="mr-1" />
                {statusInfo.label}
              </span>
              
              <span className={`text-xs ${priorityInfo.color} mr-2`}>
                {priorityInfo.label}
              </span>
              
              {dueDate && (
                <span className={`flex items-center text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                  <Clock size={12} className="mr-1" />
                  {formatDate(dueDate)}
                </span>
              )}
            </div>
            
            {/* Title */}
            <Link href={`/tasks/${id}`}>
              <h3 className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm truncate">
                {title}
              </h3>
            </Link>
          </div>
          
          <div className="flex items-center space-x-2 ml-2">
            {/* Assignee */}
            {assigneeName ? (
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs" title={assigneeName}>
                {assigneeInitials}
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs" title="Не назначено">
                <User size={12} />
              </div>
            )}
            
            {/* Menu */}
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <MoreVertical size={14} />
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
        </div>
        
        {/* Project and Additional Info */}
        <div className="flex justify-between items-center text-xs mt-1">
          <Link 
            href={`/projects/${projectId}`}
            className="text-blue-600 hover:underline"
          >
            {projectTitle}
          </Link>
          
          <div className="flex items-center space-x-3">
            {messagesCount > 0 && (
              <div className="flex items-center text-gray-500">
                <MessageSquare size={12} className="mr-1" />
                <span>{messagesCount}</span>
              </div>
            )}
            
            {attachmentsCount > 0 && (
              <div className="flex items-center text-gray-500">
                <Paperclip size={12} className="mr-1" />
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