'use client';

import AppLayout from '@/components/app-layout';
import { 
  ArrowLeft, 
  Edit, 
  MoreVertical, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  Plus,
  MessageSquare,
  Paperclip,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  X,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { taskAttachmentService } from '@/services/task-attachments';

// Типы данных
interface TaskDetails {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 1 | 2 | 3;
  createdAt: string;
  dueDate?: string;
  project: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
    initials: string;
  };
  attachments: {
    id: string;
    name: string;
    type: string;
    size: string;
    uploadDate: string;
    url: string;
    path?: string; // Путь к файлу в хранилище
  }[];
  comments: {
    id: string;
    author: {
      id: string;
      name: string;
      initials: string;
    };
    text: string;
    createdAt: string;
    attachments?: {
      id: string;
      name: string;
      url: string;
    }[];
  }[];
}

// Временные данные
const mockTask: TaskDetails = {
  id: '1',
  title: 'Замер окон на объекте',
  description: 'Выполнить замер всех окон в корпусе А, подготовить чертежи и спецификацию. Замеры необходимо сделать с учетом особенностей конструкции и требований по энергосбережению.',
  status: 'in_progress',
  priority: 2,
  createdAt: '2025-09-10',
  dueDate: '2025-10-05',
  project: {
    id: '1',
    name: 'ЖК "Морской бриз"',
  },
  assignee: {
    id: '2',
    name: 'Петров П.П.',
    initials: 'ПП',
  },
  attachments: [
    {
      id: '1',
      name: 'План_этажа.pdf',
      type: 'pdf',
      size: '1.2 MB',
      uploadDate: '2025-09-12',
      url: '/files/task-1',
    },
    {
      id: '2',
      name: 'Техзадание.docx',
      type: 'docx',
      size: '350 KB',
      uploadDate: '2025-09-12',
      url: '/files/task-2',
    },
  ],
  comments: [
    {
      id: '1',
      author: {
        id: '1',
        name: 'Иванов И.И.',
        initials: 'ИИ',
      },
      text: 'Необходимо уточнить требования к звукоизоляции окон на фасаде, выходящем на проспект.',
      createdAt: '2025-09-15T10:30:00',
      attachments: [],
    },
    {
      id: '2',
      author: {
        id: '2',
        name: 'Петров П.П.',
        initials: 'ПП',
      },
      text: 'Уточнил с заказчиком. Требуется шумоизоляция 42 дБ для окон на фасаде. Прикладываю спецификацию.',
      createdAt: '2025-09-15T14:22:00',
      attachments: [
        {
          id: '3',
          name: 'Спецификация_звукоизоляции.pdf',
          url: '/files/comment-1',
        },
      ],
    },
  ],
};

const statusMap = {
  todo: { label: 'К выполнению', color: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'В работе', color: 'bg-blue-100 text-blue-800' },
  blocked: { label: 'Заблокировано', color: 'bg-red-100 text-red-800' },
  review: { label: 'На проверке', color: 'bg-purple-100 text-purple-800' },
  done: { label: 'Выполнено', color: 'bg-green-100 text-green-800' },
};

const priorityMap = {
  1: { label: 'Высокий', color: 'bg-red-100 text-red-800' },
  2: { label: 'Средний', color: 'bg-yellow-100 text-yellow-800' },
  3: { label: 'Низкий', color: 'bg-green-100 text-green-800' },
};

export default function TaskPage() {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedCommentFile, setSelectedCommentFile] = useState<File | null>(null);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };
  
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return `${date.toLocaleDateString('ru-RU')} в ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Проверка размера файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Файл слишком большой. Максимальный размер - 10MB');
      return;
    }
    
    // Проверка типа файла
    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'application/zip',
      'application/x-rar-compressed'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Неподдерживаемый тип файла. Пожалуйста, загрузите PDF, Word, Excel, изображение или архив.');
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Загрузка файла на сервер
      const { data: fileData, error } = await taskAttachmentService.uploadFile(mockTask.id, file);
      
      if (error) {
        setUploadError('Ошибка при загрузке файла. Пожалуйста, попробуйте снова.');
        console.error('Ошибка загрузки:', error);
        setIsUploading(false);
        return;
      }
      
      // Добавляем файл в список вложений
      if (fileData) {
        mockTask.attachments.push(fileData);
      }
      
      // Очищаем input после загрузки
      e.target.value = '';
      
      // Завершаем загрузку
      setIsUploading(false);
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      setUploadError('Произошла неизвестная ошибка. Пожалуйста, попробуйте снова.');
      setIsUploading(false);
    }
  };
  
  const handleDeleteFile = async (fileId: string) => {
    // Найдем файл в массиве вложений
    const fileIndex = mockTask.attachments.findIndex(file => file.id === fileId);
    if (fileIndex === -1) return;
    
    const file = mockTask.attachments[fileIndex];
    
    try {
      // Если у файла есть путь (он загружен в Supabase)
      if (file.path) {
        const { error } = await taskAttachmentService.deleteFile(fileId, file.path);
        if (error) {
          console.error('Ошибка при удалении файла:', error);
          return;
        }
      }
      
      // Удаляем файл из локального массива
      mockTask.attachments.splice(fileIndex, 1);
      
      // Форсируем обновление компонента
      setIsUploading(prev => !prev);
    } catch (error) {
      console.error('Ошибка при удалении файла:', error);
    }
  };
  
  const isImageFile = (fileType: string) => {
    return fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
  };
  
  const handleCommentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверка размера файла (максимум 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Файл слишком большой. Максимальный размер - 10MB');
        return;
      }
      
      setSelectedCommentFile(file);
      setUploadError(null);
    }
  };
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim() && !selectedCommentFile) return;
    
    setIsSubmitting(true);
    
    try {
      // Добавление комментария в базу данных
      const { data: commentData, error } = await taskAttachmentService.addComment(
        mockTask.id, 
        comment, 
        'current-user', // В реальном приложении - ID текущего пользователя
        'Текущий пользователь', // Имя пользователя
        'ТП', // Инициалы пользователя
        selectedCommentFile || undefined
      );
      
      if (error) {
        console.error('Ошибка при добавлении комментария:', error);
        setIsSubmitting(false);
        return;
      }
      
      if (commentData) {
        // Добавляем комментарий в массив
        mockTask.comments.push(commentData);
      }
      
      // Сбрасываем форму
      setComment('');
      setSelectedCommentFile(null);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Ошибка при отправке комментария:', error);
      setIsSubmitting(false);
    }
  };
  
  const handleStatusChange = (newStatus: TaskDetails['status']) => {
    // Здесь будет логика изменения статуса
    console.log('Новый статус:', newStatus);
  };

  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center">
            <Link href="/tasks" className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
              <ArrowLeft size={20} />
            </Link>
          
          <div>
            <div className="flex items-center mb-1">
              <Link href={`/projects/${mockTask.project.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                {mockTask.project.name}
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{mockTask.title}</h1>
            <div className="flex items-center mt-2">
              <span className={`text-xs px-2.5 py-1 rounded-full ${statusMap[mockTask.status].color}`}>
                {statusMap[mockTask.status].label}
              </span>
              
              <span className="mx-2 text-gray-300">•</span>
              
              <span className={`text-xs px-2.5 py-1 rounded-full ${priorityMap[mockTask.priority].color}`}>
                {priorityMap[mockTask.priority].label} приоритет
              </span>
              
              <span className="mx-2 text-gray-300">•</span>
              
              <span className="text-sm text-gray-500">
                Создана {formatDate(mockTask.createdAt)}
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Описание задачи */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Описание</h2>
            <p className="text-gray-700 whitespace-pre-line">{mockTask.description}</p>
          </div>
          
          {/* Файлы */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Вложения</h2>
              
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                <Plus size={16} className="mr-2" />
                Добавить файл
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            
            {isUploading && (
              <div className="mb-4 flex items-center justify-between bg-blue-50 text-blue-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  <span>Загрузка файла...</span>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse w-2/3"></div>
                </div>
              </div>
            )}
            
            {uploadError && (
              <div className="mb-4 flex items-center justify-between bg-red-50 text-red-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  {uploadError}
                </div>
                <button onClick={() => setUploadError(null)} className="text-red-700">
                  <X size={16} />
                </button>
              </div>
            )}
            
            {mockTask.attachments.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {mockTask.attachments.map(file => (
                  <li key={file.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center">
                      {isImageFile(file.type) ? (
                        <div className="w-10 h-10 mr-3 rounded bg-gray-100 overflow-hidden flex items-center justify-center">
                          <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <FileText size={20} className="text-gray-400 mr-3" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.size} • Добавлен {formatDate(file.uploadDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <a 
                        href={file.url} 
                        download
                        className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full mr-1"
                        title="Скачать"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">Нет вложенных файлов</p>
            )}
          </div>
          
          {/* Комментарии */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Комментарии</h2>
            
            <div className="space-y-4 mb-6">
              {mockTask.comments.map(comment => (
                <div key={comment.id} className="border-b border-gray-100 pb-4">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs mr-3">
                      {comment.author.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {comment.author.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pl-11">
                    <p className="text-sm text-gray-700 mb-2">{comment.text}</p>
                    
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-2 mb-1">
                        <p className="text-xs text-gray-500 mb-1">Вложения:</p>
                        <ul className="space-y-1">
                          {comment.attachments.map(attachment => (
                            <li key={attachment.id} className="text-sm">
                              <a 
                                href={attachment.url} 
                                className="text-blue-600 hover:text-blue-800 flex items-center"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {isImageFile(attachment.name.split('.').pop() || '') ? (
                                  <div className="w-5 h-5 mr-1 rounded bg-gray-100 overflow-hidden flex items-center justify-center">
                                    <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain" />
                                  </div>
                                ) : (
                                  <Paperclip size={14} className="mr-1" />
                                )}
                                {attachment.name}
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
            
            <form onSubmit={handleSubmitComment}>
              <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Напишите комментарий..."
                  className="block w-full border-0 focus:ring-0 p-3 text-sm"
                  rows={3}
                ></textarea>
                
                <div className="bg-gray-50 p-2 flex justify-between items-center">
                  <div className="flex items-center">
                    <label htmlFor="comment-file" className="cursor-pointer">
                      <div className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                        <Paperclip size={18} />
                      </div>
                      <input
                        id="comment-file"
                        type="file"
                        className="hidden"
                        onChange={handleCommentFileSelect}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                      />
                    </label>
                    
                    {selectedCommentFile && (
                      <div className="ml-2 flex items-center bg-blue-50 text-blue-700 text-xs rounded-full py-1 px-3">
                        <span className="truncate max-w-[150px]">{selectedCommentFile.name}</span>
                        <button 
                          type="button"
                          onClick={() => setSelectedCommentFile(null)}
                          className="ml-1 text-blue-500 hover:text-blue-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    
                    {uploadError && (
                      <div className="ml-2 text-red-500 text-xs">{uploadError}</div>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={(!comment.trim() && !selectedCommentFile) || isSubmitting}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg ${
                      (!comment.trim() && !selectedCommentFile) || isSubmitting
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send size={16} className="mr-2" />
                        Отправить
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Действия */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Статус</h2>
            
            <div className="space-y-2">
              <button
                onClick={() => handleStatusChange('todo')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                  mockTask.status === 'todo'
                    ? 'bg-gray-100 text-gray-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="w-4 h-4 rounded-full border-2 border-gray-500 mr-3"></div>
                К выполнению
              </button>
              
              <button
                onClick={() => handleStatusChange('in_progress')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                  mockTask.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Loader2 size={16} className={`mr-3 ${mockTask.status === 'in_progress' ? 'text-blue-500' : 'text-gray-500'}`} />
                В работе
              </button>
              
              <button
                onClick={() => handleStatusChange('blocked')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                  mockTask.status === 'blocked'
                    ? 'bg-red-100 text-red-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <AlertCircle size={16} className={`mr-3 ${mockTask.status === 'blocked' ? 'text-red-500' : 'text-gray-500'}`} />
                Заблокировано
              </button>
              
              <button
                onClick={() => handleStatusChange('review')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                  mockTask.status === 'review'
                    ? 'bg-purple-100 text-purple-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User size={16} className={`mr-3 ${mockTask.status === 'review' ? 'text-purple-500' : 'text-gray-500'}`} />
                На проверке
              </button>
              
              <button
                onClick={() => handleStatusChange('done')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                  mockTask.status === 'done'
                    ? 'bg-green-100 text-green-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CheckCircle size={16} className={`mr-3 ${mockTask.status === 'done' ? 'text-green-500' : 'text-gray-500'}`} />
                Выполнено
              </button>
            </div>
          </div>
          
          {/* Детали */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Детали</h2>
            
            <ul className="space-y-4">
              <li>
                <p className="text-sm text-gray-500">Проект</p>
                <Link href={`/projects/${mockTask.project.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  {mockTask.project.name}
                </Link>
              </li>
              
              <li>
                <p className="text-sm text-gray-500">Исполнитель</p>
                {mockTask.assignee ? (
                  <div className="flex items-center mt-1">
                    <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs mr-2">
                      {mockTask.assignee.initials}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {mockTask.assignee.name}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus size={14} className="mr-1" />
                    Назначить
                  </button>
                )}
              </li>
              
              {mockTask.dueDate && (
                <li>
                  <p className="text-sm text-gray-500">Срок выполнения</p>
                  <div className="flex items-center mt-1">
                    <Calendar size={16} className="text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(mockTask.dueDate)}
                    </span>
                  </div>
                </li>
              )}
              
              <li>
                <p className="text-sm text-gray-500">Приоритет</p>
                <span className={`mt-1 inline-block text-xs px-2.5 py-1 rounded-full ${priorityMap[mockTask.priority].color}`}>
                  {priorityMap[mockTask.priority].label}
                </span>
              </li>
              
              <li>
                <p className="text-sm text-gray-500">Комментарии</p>
                <div className="flex items-center mt-1">
                  <MessageSquare size={16} className="text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    {mockTask.comments.length}
                  </span>
                </div>
              </li>
              
              <li>
                <p className="text-sm text-gray-500">Вложения</p>
                <div className="flex items-center mt-1">
                  <Paperclip size={16} className="text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    {mockTask.attachments.length}
                  </span>
                </div>
              </li>
              
              <li>
                <p className="text-sm text-gray-500">Дата создания</p>
                <div className="flex items-center mt-1">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(mockTask.createdAt)}
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}