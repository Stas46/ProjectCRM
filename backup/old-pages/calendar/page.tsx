'use client';

import AppLayout from '@/components/app-layout';
import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Users, 
  Plus,
  User,
  MapPin,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  assignees: {
    id: string;
    name: string;
    initials: string;
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
    assignees: [
      { id: '1', name: 'Иванов И.И.', initials: 'ИИ' },
      { id: '2', name: 'Петров П.П.', initials: 'ПП' },
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
    assignees: [
      { id: '3', name: 'Сидоров С.С.', initials: 'СС' },
      { id: '4', name: 'Козлов К.К.', initials: 'КК' },
      { id: '5', name: 'Новиков Н.Н.', initials: 'НН' },
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
    assignees: [
      { id: '1', name: 'Иванов И.И.', initials: 'ИИ' },
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
    assignees: [
      { id: '6', name: 'Соколов С.С.', initials: 'СС' },
    ],
  },
];

// Вспомогательные функции для работы с датами
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay() || 7; // 0 - воскресенье, 1 - понедельник, ..., 6 - суббота
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

// Названия месяцев и дней недели
const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 8, 22)); // 22 сентября 2025
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const router = useRouter();
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  
  // Навигация по месяцам
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date(2025, 8, 22)); // Сегодня 22 сентября 2025 г.
  };
  
  // Фильтрация смен для текущего месяца
  const shiftsInCurrentMonth = mockShifts.filter(shift => {
    const shiftMonth = shift.start.getMonth();
    const shiftYear = shift.start.getFullYear();
    return shiftMonth === currentMonth && shiftYear === currentYear;
  });
  
  // Смены сгруппированные по дням
  const shiftsByDay: Record<number, Shift[]> = {};
  
  shiftsInCurrentMonth.forEach(shift => {
    const day = shift.start.getDate();
    if (!shiftsByDay[day]) {
      shiftsByDay[day] = [];
    }
    shiftsByDay[day].push(shift);
  });
  
  // Построение сетки календаря
  const calendarDays = [];
  const totalCells = firstDayOfMonth - 1 + daysInMonth;
  
  // Пустые ячейки в начале
  for (let i = 0; i < firstDayOfMonth - 1; i++) {
    calendarDays.push(null);
  }
  
  // Заполнение дней месяца
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  
  // Обработчик перехода к деталям смены
  const handleShiftClick = (shiftId: string) => {
    router.push(`/calendar/${shiftId}`);
  };

  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Календарь работ</h1>
          <Link
            href="/calendar/new"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
          >
            <Plus size={20} className="mr-2" />
            Новая смена
          </Link>
        </div>
      
      {/* Навигация по календарю */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-lg font-medium">
            {monthNames[currentMonth]} {currentYear}
          </span>
          
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ChevronRight size={20} />
          </button>
          
          <button
            type="button"
            onClick={goToToday}
            className="ml-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
          >
            Сегодня
          </button>
        </div>
        
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 text-sm rounded-md ${
              viewMode === 'month' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar size={16} className="inline mr-1" />
            Месяц
          </button>
          
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 text-sm rounded-md ${
              viewMode === 'week' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users size={16} className="inline mr-1" />
            Бригады
          </button>
        </div>
      </div>
      
      {/* Месячный вид */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Дни недели */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {dayNames.map((day, index) => (
              <div key={index} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          {/* Сетка календаря */}
          <div className="grid grid-cols-7 auto-rows-fr">
            {calendarDays.map((day, index) => {
              // Если день null - это пустая ячейка
              if (day === null) {
                return <div key={`empty-${index}`} className="border-b border-r p-1 bg-gray-50" />;
              }
              
              const isToday = day === currentDay;
              const dayShifts = shiftsByDay[day] || [];
              
              return (
                <div 
                  key={`day-${day}`} 
                  className={`
                    border-b border-r p-1 min-h-[100px] 
                    ${isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex justify-end">
                    <span className={`
                      inline-flex items-center justify-center w-6 h-6 text-sm rounded-full
                      ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}
                    `}>
                      {day}
                    </span>
                  </div>
                  
                  <div className="mt-1 space-y-1">
                    {dayShifts.map(shift => (
                      <div 
                        key={shift.id}
                        className="p-1 rounded text-xs bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                        onClick={() => handleShiftClick(shift.id)}
                      >
                        <div className="font-medium truncate">{shift.title}</div>
                        <div className="flex items-center text-blue-700">
                          <Clock size={10} className="mr-1" />
                          {formatTime(shift.start)} - {formatTime(shift.end)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Вид по бригадам */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-medium">Бригада №1</h3>
            </div>
            
            <div className="divide-y">
              {mockShifts
                .filter(shift => shift.crewName === 'Бригада №1')
                .map(shift => (
                  <div 
                    key={shift.id} 
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleShiftClick(shift.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{shift.title}</h4>
                        <p className="text-sm text-blue-600">{shift.projectTitle}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {shift.start.toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <Clock size={16} className="mr-2" />
                      {formatTime(shift.start)} - {formatTime(shift.end)}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <MapPin size={16} className="mr-2" />
                      {shift.location}
                    </div>
                    
                    <div className="flex -space-x-2">
                      {shift.assignees.map(assignee => (
                        <div 
                          key={assignee.id}
                          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs border-2 border-white"
                          title={assignee.name}
                        >
                          {assignee.initials}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-medium">Бригада №2</h3>
            </div>
            
            <div className="divide-y">
              {mockShifts
                .filter(shift => shift.crewName === 'Бригада №2')
                .map(shift => (
                  <div 
                    key={shift.id} 
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleShiftClick(shift.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{shift.title}</h4>
                        <p className="text-sm text-blue-600">{shift.projectTitle}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {shift.start.toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <Clock size={16} className="mr-2" />
                      {formatTime(shift.start)} - {formatTime(shift.end)}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <MapPin size={16} className="mr-2" />
                      {shift.location}
                    </div>
                    
                    <div className="flex -space-x-2">
                      {shift.assignees.map(assignee => (
                        <div 
                          key={assignee.id}
                          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs border-2 border-white"
                          title={assignee.name}
                        >
                          {assignee.initials}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-medium">Другие сотрудники</h3>
            </div>
            
            <div className="divide-y">
              {mockShifts
                .filter(shift => !shift.crewName)
                .map(shift => (
                  <div 
                    key={shift.id} 
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleShiftClick(shift.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{shift.title}</h4>
                        <p className="text-sm text-blue-600">{shift.projectTitle}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {shift.start.toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <Clock size={16} className="mr-2" />
                      {formatTime(shift.start)} - {formatTime(shift.end)}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <MapPin size={16} className="mr-2" />
                      {shift.location}
                    </div>
                    
                    <div className="flex -space-x-2">
                      {shift.assignees.map(assignee => (
                        <div 
                          key={assignee.id}
                          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs border-2 border-white"
                          title={assignee.name}
                        >
                          {assignee.initials}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  );
}