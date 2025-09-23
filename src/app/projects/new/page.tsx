'use client';

import AppLayout from '@/components/app-layout';
import { useState } from 'react';
import { 
  ArrowLeft, 
  Save,
  Plus,
  X
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Типы данных
interface TeamMember {
  id?: string;
  name: string;
  role: string;
}

interface ProjectFormData {
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
  dueDate: string;
  budget: string;
  team: TeamMember[];
}

export default function NewProjectPage() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    client: {
      name: '',
      company: '',
      phone: '',
      email: '',
    },
    address: '',
    status: 'planning',
    startDate: today,
    dueDate: '',
    budget: '',
    team: [],
  });

  const [newTeamMember, setNewTeamMember] = useState<TeamMember>({
    name: '',
    role: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => {
        if (parent === 'client') {
          return {
            ...prev,
            client: {
              ...prev.client,
              [child]: value,
            },
          };
        }
        return prev;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Очистка ошибки при изменении поля
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleAddTeamMember = () => {
    if (!newTeamMember.name || !newTeamMember.role) {
      setErrors(prev => ({
        ...prev,
        teamMember: 'Необходимо указать имя и роль участника',
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      team: [...prev.team, { ...newTeamMember, id: Date.now().toString() }],
    }));
    
    setNewTeamMember({ name: '', role: '' });
    
    if (errors.teamMember) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.teamMember;
        return newErrors;
      });
    }
  };
  
  const handleRemoveTeamMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      team: prev.team.filter(member => member.id !== id),
    }));
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Необходимо указать название проекта';
    }
    
    if (!formData.client.name.trim()) {
      newErrors['client.name'] = 'Необходимо указать контактное лицо';
    }
    
    if (!formData.client.phone.trim()) {
      newErrors['client.phone'] = 'Необходимо указать телефон';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Необходимо указать адрес';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Необходимо указать дату начала';
    }
    
    if (formData.budget && isNaN(Number(formData.budget))) {
      newErrors.budget = 'Бюджет должен быть числом';
    }
    
    return newErrors;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Прокрутка к первой ошибке
      const firstErrorField = document.querySelector(`[name="${Object.keys(newErrors)[0]}"]`);
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Преобразование данных для сохранения в Supabase
      const projectData = {
        title: formData.title,
        client: formData.client.name,
        address: formData.address,
        status: formData.status,
        description: formData.description,
        due_date: formData.dueDate || null,
        budget: formData.budget ? parseFloat(formData.budget) : null
      };
      
      console.log('Отправляем данные в Supabase:', JSON.stringify(projectData, null, 2));
      
      // Сохранение проекта в базу данных
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select();
      
      if (error) {
        console.error('Ошибка при сохранении проекта:', JSON.stringify(error, null, 2));
        setSubmitError(`Ошибка при сохранении проекта: ${error.message || 'Неизвестная ошибка'}`);
        return;
      }
      
      console.log('Проект успешно создан:', data);
      
      // Если нужно создать участников команды, можно сделать это здесь
      if (formData.team.length > 0 && data?.[0]?.id) {
        const projectId = data[0].id;
        
        // Здесь можно добавить код для сохранения участников команды
        // например через таблицу project_team или другую соответствующую таблицу
      }
      
      // Перенаправление на страницу проектов
      router.push('/projects');
      
    } catch (err: any) {
      console.error('Ошибка при сохранении:', err);
      setSubmitError(`Произошла ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href="/" className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Новый проект</h1>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h2>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Название проекта*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.title ? 'border-red-300' : ''
                }`}
                placeholder="Введите название проекта"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Описание проекта
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Введите описание проекта"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Статус проекта*
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="planning">Планирование</option>
                  <option value="active">Активен</option>
                  <option value="on_hold">На паузе</option>
                  <option value="done">Завершен</option>
                  <option value="cancelled">Отменен</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Адрес объекта*
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.address ? 'border-red-300' : ''
                  }`}
                  placeholder="Введите адрес объекта"
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Дата начала*
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.startDate ? 'border-red-300' : ''
                  }`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>
              
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Дата завершения
                </label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min={formData.startDate}
                />
              </div>
              
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                  Бюджет (₽)
                </label>
                <input
                  type="text"
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.budget ? 'border-red-300' : ''
                  }`}
                  placeholder="Введите бюджет"
                />
                {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Информация о клиенте</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="client.name" className="block text-sm font-medium text-gray-700 mb-1">
                Контактное лицо*
              </label>
              <input
                type="text"
                id="client.name"
                name="client.name"
                value={formData.client.name}
                onChange={handleChange}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors['client.name'] ? 'border-red-300' : ''
                }`}
                placeholder="Введите имя контактного лица"
              />
              {errors['client.name'] && <p className="mt-1 text-sm text-red-600">{errors['client.name']}</p>}
            </div>
            
            <div>
              <label htmlFor="client.company" className="block text-sm font-medium text-gray-700 mb-1">
                Компания
              </label>
              <input
                type="text"
                id="client.company"
                name="client.company"
                value={formData.client.company}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Введите название компании"
              />
            </div>
            
            <div>
              <label htmlFor="client.phone" className="block text-sm font-medium text-gray-700 mb-1">
                Телефон*
              </label>
              <input
                type="tel"
                id="client.phone"
                name="client.phone"
                value={formData.client.phone}
                onChange={handleChange}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors['client.phone'] ? 'border-red-300' : ''
                }`}
                placeholder="+7 (___) ___-__-__"
              />
              {errors['client.phone'] && <p className="mt-1 text-sm text-red-600">{errors['client.phone']}</p>}
            </div>
            
            <div>
              <label htmlFor="client.email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="client.email"
                name="client.email"
                value={formData.client.email}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="example@mail.ru"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Команда проекта</h2>
          
          <div className="mb-6">
            {formData.team.length > 0 ? (
              <div className="space-y-3">
                {formData.team.map(member => (
                  <div key={member.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamMember(member.id as string)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Участники не добавлены</p>
            )}
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Добавить участника</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <input
                  type="text"
                  value={newTeamMember.name}
                  onChange={e => setNewTeamMember(prev => ({ ...prev, name: e.target.value }))}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.teamMember ? 'border-red-300' : ''
                  }`}
                  placeholder="Имя участника"
                />
              </div>
              
              <div>
                <input
                  type="text"
                  value={newTeamMember.role}
                  onChange={e => setNewTeamMember(prev => ({ ...prev, role: e.target.value }))}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.teamMember ? 'border-red-300' : ''
                  }`}
                  placeholder="Должность/роль"
                />
              </div>
            </div>
            
            {errors.teamMember && <p className="mt-1 mb-3 text-sm text-red-600">{errors.teamMember}</p>}
            
            <button
              type="button"
              onClick={handleAddTeamMember}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
            >
              <Plus size={16} className="mr-2" />
              Добавить
            </button>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Отмена
          </Link>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:ring-4 focus:ring-blue-300 ${
              isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Сохранить проект
              </>
            )}
          </button>
        </div>
        
        {submitError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}
      </form>
    </AppLayout>
  );
}