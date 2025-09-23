'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { ArrowLeft, Calendar, Clock, MapPin, Users, User } from 'lucide-react';
import Link from 'next/link';

// Типы данных
interface Crew {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  initials: string;
}

interface Project {
  id: string;
  title: string;
  client: string;
  address: string;
}

// Временные данные
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'ЖК "Морской бриз"',
    client: 'ООО "СтройИнвест"',
    address: 'г. Москва, ул. Приморская, д. 15'
  },
  {
    id: '2',
    title: 'Коттедж Иванова',
    client: 'Иванов А.А.',
    address: 'Московская обл., пос. Лесной, ул. Сосновая, д. 7'
  },
  {
    id: '3',
    title: 'Офисный центр "Горизонт"',
    client: 'ЗАО "Бизнес Недвижимость"',
    address: 'г. Санкт-Петербург, пр-т Невский, д. 78'
  },
];

const mockCrews: Crew[] = [
  { id: '1', name: 'Бригада №1' },
  { id: '2', name: 'Бригада №2' },
  { id: '3', name: 'Бригада №3' },
];

const mockEmployees: Employee[] = [
  { id: '1', name: 'Иванов Иван Иванович', position: 'Монтажник', initials: 'ИИ' },
  { id: '2', name: 'Петров Петр Петрович', position: 'Монтажник', initials: 'ПП' },
  { id: '3', name: 'Сидоров Сергей Сергеевич', position: 'Замерщик', initials: 'СС' },
  { id: '4', name: 'Козлов Константин Константинович', position: 'Монтажник', initials: 'КК' },
  { id: '5', name: 'Новиков Николай Николаевич', position: 'Водитель', initials: 'НН' },
  { id: '6', name: 'Соколов Станислав Станиславович', position: 'Логист', initials: 'СС' },
];

export default function NewShiftPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    projectId: '',
    crewId: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    selectedEmployees: [] as string[],
  });
  
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Обработка изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Сброс ошибки поля при изменении
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Обработка выбора сотрудников
  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
    
    // Сброс ошибки поля сотрудников
    if (formErrors.selectedEmployees) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.selectedEmployees;
        return newErrors;
      });
    }
  };

  // Выбор проекта заполняет поле адреса
  const selectedProject = mockProjects.find(p => p.id === formData.projectId);
  
  // Валидация формы
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Введите название смены';
    }
    
    if (!formData.projectId) {
      errors.projectId = 'Выберите проект';
    }
    
    if (!formData.date) {
      errors.date = 'Выберите дату';
    }
    
    if (!formData.startTime) {
      errors.startTime = 'Выберите время начала';
    }
    
    if (!formData.endTime) {
      errors.endTime = 'Выберите время окончания';
    }
    
    if (selectedEmployees.length === 0) {
      errors.selectedEmployees = 'Выберите хотя бы одного сотрудника';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Обработка отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Здесь будет логика сохранения смены
      console.log('Форма отправлена', { ...formData, selectedEmployees });
      
      // Перенаправление на страницу календаря
      router.push('/calendar');
    }
  };

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
      
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Новая смена</h1>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          {/* Основная информация */}
          <div className="space-y-6 mb-8">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Название смены <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  formErrors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Например: Замер окон"
              />
              {formErrors.title && (
                <p className="mt-1 text-sm text-red-500">{formErrors.title}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">
                Проект <span className="text-red-500">*</span>
              </label>
              <select
                id="projectId"
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  formErrors.projectId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Выберите проект</option>
                {mockProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              {formErrors.projectId && (
                <p className="mt-1 text-sm text-red-500">{formErrors.projectId}</p>
              )}
            </div>
            
            {selectedProject && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-500 mb-1">Адрес объекта:</div>
                <div className="text-sm font-medium">{selectedProject.address}</div>
              </div>
            )}
            
            <div>
              <label htmlFor="crewId" className="block text-sm font-medium text-gray-700 mb-1">
                Бригада
              </label>
              <select
                id="crewId"
                name="crewId"
                value={formData.crewId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Без назначения бригады</option>
                {mockCrews.map(crew => (
                  <option key={crew.id} value={crew.id}>
                    {crew.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Дата и время */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Calendar size={18} className="inline-block mr-2" />
              Дата и время
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Дата <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    formErrors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.date && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.date}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Время начала <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    formErrors.startTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.startTime && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.startTime}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Время окончания <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    formErrors.endTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.endTime && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.endTime}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Сотрудники */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Users size={18} className="inline-block mr-2" />
              Сотрудники <span className="text-red-500">*</span>
            </h3>
            
            {formErrors.selectedEmployees && (
              <p className="mb-2 text-sm text-red-500">{formErrors.selectedEmployees}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {mockEmployees.map(employee => (
                <div 
                  key={employee.id}
                  onClick={() => handleEmployeeToggle(employee.id)}
                  className={`p-3 border rounded-md cursor-pointer ${
                    selectedEmployees.includes(employee.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs mr-3 ${
                      selectedEmployees.includes(employee.id) ? 'bg-blue-500' : 'bg-gray-400'
                    }`}>
                      {employee.initials}
                    </div>
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-xs text-gray-500">{employee.position}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Описание */}
          <div className="mb-8">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Описание работ
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Добавьте подробное описание задачи..."
            />
          </div>
          
          {/* Кнопки управления */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href="/calendar"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Отмена
            </Link>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Создать смену
            </button>
          </div>
        </form>
      </div>
      </div>
    </AppLayout>
  );
}