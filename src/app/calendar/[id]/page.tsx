'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Типы данных
interface Shift {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  crewId?: string;
  crewName?: string;
  start: Date;
  end: Date;
  location: string;
  description?: string;
  assignees: {
    id: string;
    name: string;
    initials: string;
    position: string;
  }[];
}

// Временные данные
const mockShifts: Shift[] = [
  {
    id: '1',
    title: 'Замер окон',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    crewId: '1',
    crewName: 'Бригада №1',
    start: new Date(2025, 8, 25, 9, 0), // 25 сентября 2025, 9:00
    end: new Date(2025, 8, 25, 12, 0),  // 25 сентября 2025, 12:00
    location: 'г. Москва, ул. Приморская, д. 15',
    description: 'Провести полный замер оконных проемов на первом этаже здания A. Необходимо подготовить полную документацию с размерами.',
    assignees: [
      { id: '1', name: 'Иванов И.И.', initials: 'ИИ', position: 'Замерщик' },
      { id: '2', name: 'Петров П.П.', initials: 'ПП', position: 'Монтажник' },
    ],
  },
  {
    id: '2',
    title: 'Монтаж окон (этаж 1)',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    crewId: '2',
    crewName: 'Бригада №2',
    start: new Date(2025, 8, 26, 8, 0),  // 26 сентября 2025, 8:00
    end: new Date(2025, 8, 26, 17, 0),   // 26 сентября 2025, 17:00
    location: 'г. Москва, ул. Приморская, д. 15',
    description: 'Монтаж пластиковых окон согласно проекту на первом этаже здания A.',
    assignees: [
      { id: '3', name: 'Сидоров С.С.', initials: 'СС', position: 'Монтажник' },
      { id: '4', name: 'Козлов К.К.', initials: 'КК', position: 'Монтажник' },
      { id: '5', name: 'Новиков Н.Н.', initials: 'НН', position: 'Монтажник' },
    ],
  },
  {
    id: '3',
    title: 'Замер окон',
    projectId: '2',
    projectTitle: 'Коттедж Иванова',
    crewId: '1',
    crewName: 'Бригада №1',
    start: new Date(2025, 8, 27, 14, 0), // 27 сентября 2025, 14:00
    end: new Date(2025, 8, 27, 16, 0),   // 27 сентября 2025, 16:00
    location: 'Московская обл., пос. Лесной, ул. Сосновая, д. 7',
    description: 'Провести замер оконных проемов для частного коттеджа. Клиент предпочитает деревянные окна.',
    assignees: [
      { id: '1', name: 'Иванов И.И.', initials: 'ИИ', position: 'Замерщик' },
    ],
  },
  {
    id: '4',
    title: 'Доставка материалов',
    projectId: '3',
    projectTitle: 'Офисный центр "Горизонт"',
    start: new Date(2025, 8, 24, 10, 0), // 24 сентября 2025, 10:00
    end: new Date(2025, 8, 24, 12, 0),   // 24 сентября 2025, 12:00
    location: 'г. Санкт-Петербург, пр-т Невский, д. 78',
    description: 'Доставка материалов для монтажа алюминиевых окон. Необходимо подтвердить количество материалов при получении.',
    assignees: [
      { id: '6', name: 'Соколов С.С.', initials: 'СС', position: 'Логист' },
    ],
  },
];

export default function ShiftDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // В реальном приложении здесь будет API-запрос
  useEffect(() => {
    // Имитация загрузки данных
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Имитация задержки загрузки с сервера
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Поиск смены по ID из URL
        const foundShift = mockShifts.find(s => s.id === params.id);
        
        if (foundShift) {
          setShift(foundShift);
          setError(null);
        } else {
          setError('Смена не найдена');
          setShift(null);
        }
      } catch (err) {
        setError('Ошибка при загрузке данных');
        setShift(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [params.id]);
  
  // Форматирование даты
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };
  
  // Форматирование времени
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Состояние загрузки
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Состояние ошибки
  if (error || !shift) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Ошибка</h2>
            <p className="text-gray-500 mb-6">{error || 'Не удалось загрузить данные о смене'}</p>
            <Link 
              href="/calendar" 
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Вернуться к календарю
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4">
        <div className="mb-6">
          <Link 
            href="/calendar" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={16} className="mr-1" />
            Вернуться к календарю
          </Link>
        </div>
      
      <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{shift.title}</h1>
          <Link 
            href={`/projects/${shift.projectId}`}
            className="text-blue-600 hover:underline"
          >
            {shift.projectTitle}
          </Link>
        </div>
        
        <div className="flex gap-2">
          <Link
            href={`/calendar/${shift.id}/edit`}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
          >
            Редактировать
          </Link>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
          >
            Отменить смену
          </button>
        </div>
      </div>
      
      {/* Информация о смене */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Дата и время</h2>
          </div>
          <div className="p-4">
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">Дата:</div>
              <div className="font-medium">{formatDate(shift.start)}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">Время:</div>
              <div className="flex items-center">
                <Clock size={16} className="text-gray-400 mr-2" />
                <span className="font-medium">
                  {formatTime(shift.start)} - {formatTime(shift.end)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Место проведения</h2>
          </div>
          <div className="p-4">
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">Адрес:</div>
              <div className="flex items-start">
                <MapPin size={16} className="text-gray-400 mr-2 mt-1 flex-shrink-0" />
                <span className="font-medium">{shift.location}</span>
              </div>
            </div>
            
            {shift.crewName && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Бригада:</div>
                <div className="font-medium">{shift.crewName}</div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Сотрудники</h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {shift.assignees.map(employee => (
                <div key={employee.id} className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-3">
                    {employee.initials}
                  </div>
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-xs text-gray-500">{employee.position}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Описание */}
      {shift.description && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Описание работ</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-700 whitespace-pre-line">{shift.description}</p>
          </div>
        </div>
      )}
      
      {/* История действий */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-medium text-gray-900">История</h2>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex">
              <div className="w-10 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <User size={12} className="text-green-600" />
                </div>
              </div>
              <div>
                <div className="text-sm">
                  <span className="font-medium">Администратор</span>
                  <span className="text-gray-500"> создал(а) смену</span>
                </div>
                <div className="text-xs text-gray-500">20 сентября 2025, 14:30</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}