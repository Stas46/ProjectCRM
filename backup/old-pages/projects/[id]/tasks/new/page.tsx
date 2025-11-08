'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import AppLayout from '@/components/app-layout';
import { supabase } from '@/lib/supabase';

export default function NewTaskPage() {
  const { id: projectId } = useParams() as { id: string };
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 2, // По умолчанию средний приоритет
    status: 'todo', // По умолчанию "К выполнению"
    due_date: '',
    assignee_id: ''
  });
  
  const [employees, setEmployees] = useState<Array<{id: string, name: string}>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Загрузка сотрудников для выбора исполнителя
  useState(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name')
          .order('name');
        
        if (error) {
          console.error('Ошибка при загрузке сотрудников:', error);
          return;
        }
        
        if (data) {
          setEmployees(data);
        }
      } catch (err) {
        console.error('Исключение при загрузке сотрудников:', err);
      }
    };
    
    fetchEmployees();
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Очистка ошибки при изменении поля
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Необходимо указать название задачи';
    }
    
    return newErrors;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Преобразование данных для сохранения
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        priority: parseInt(formData.priority.toString()),
        status: formData.status,
        project_id: projectId,
        assignee_id: formData.assignee_id || null,
        due_date: formData.due_date || null
      };
      
      console.log('Отправляем данные задачи:', JSON.stringify(taskData, null, 2));
      
      // Сохранение задачи в базу данных
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select();
      
      if (error) {
        console.error('Ошибка при сохранении задачи:', JSON.stringify(error, null, 2));
        setSubmitError(`Ошибка при сохранении задачи: ${error.message || 'Неизвестная ошибка'}`);
        return;
      }
      
      console.log('Задача успешно создана:', data);
      
      // Перенаправление обратно на страницу проекта
      router.push(`/projects/${projectId}`);
      
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
          <Link href={`/projects/${projectId}`} className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Новая задача</h1>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Название задачи*
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
                placeholder="Введите название задачи"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Описание задачи
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Введите описание задачи"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Статус задачи*
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="todo">К выполнению</option>
                  <option value="in_progress">В работе</option>
                  <option value="blocked">Заблокировано</option>
                  <option value="review">На проверке</option>
                  <option value="done">Выполнено</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Приоритет*
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value={1}>Низкий</option>
                  <option value={2}>Средний</option>
                  <option value={3}>Высокий</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Срок выполнения
                </label>
                <input
                  type="date"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Исполнитель
                </label>
                <select
                  id="assignee_id"
                  name="assignee_id"
                  value={formData.assignee_id}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Не назначен</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>{employee.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Link
            href={`/projects/${projectId}`}
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
                Сохранить задачу
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