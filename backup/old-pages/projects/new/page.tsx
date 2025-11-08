'use client';

import AppLayout from '@/components/app-layout';
import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { generateUniqueProjectNumber } from '@/lib/generate-project-number';

// Упрощенные типы данных - только обязательные поля
interface SimpleProjectFormData {
  title: string;          // Название проекта
  clientName: string;     // Имя клиента
}

export default function NewProjectPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState<SimpleProjectFormData>({
    title: '',
    clientName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
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

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Необходимо указать название проекта';
    }
    
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Необходимо указать имя клиента';
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
      // 1. Генерируем уникальный номер проекта
      const projectNumber = await generateUniqueProjectNumber();
      console.log('📋 Сгенерирован номер проекта:', projectNumber);
      
      // 2. Создаем клиента (упрощенно - только имя)
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          type: 'individual',
          name: formData.clientName,
          is_active: true
        })
        .select()
        .single();

      if (clientError) {
        console.error('Ошибка при создании клиента:', clientError);
        setSubmitError(`Ошибка при создании клиента: ${clientError.message}`);
        return;
      }

      // 3. Создаем проект с минимальными данными
      const projectData = {
        project_number: projectNumber,
        title: formData.title,
        client_id: clientData.id,
        address: '', // Пустой адрес - заполнить можно позже
        status: 'planning',
        description: '',
      };
      
      console.log('📊 Создаем проект:', projectData);
      
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select();
      
      if (error) {
        console.error('Ошибка при сохранении проекта:', error);
        setSubmitError(`Ошибка при сохранении проекта: ${error.message}`);
        return;
      }
      
      console.log('✅ Проект успешно создан:', data);
      
      // Перенаправление на страницу созданного проекта
      if (data && data[0]) {
        router.push(`/projects/${data[0].id}`);
      } else {
        router.push('/projects');
      }
      
    } catch (err: any) {
      console.error('Ошибка при сохранении:', err);
      setSubmitError(`Произошла ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Шапка страницы */}
        <div className="mb-8">
          <Link 
            href="/projects" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Вернуться к проектам
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900">Создать новый проект</h1>
          <p className="mt-2 text-gray-600">
            Укажите название проекта и имя клиента. Остальные детали можно добавить позже.
          </p>
        </div>

        {/* Ошибка отправки */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {/* Форма */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="p-6 space-y-6">
            
            {/* Название проекта */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Название проекта <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Например: Остекление балкона на ул. Ленина"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Проекту будет автоматически присвоен уникальный номер (например: PRJ-2024-0001)
              </p>
            </div>

            {/* Имя клиента */}
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                Имя клиента <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.clientName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Например: Иван Иванович или ООО Ромашка"
              />
              {errors.clientName && (
                <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Дополнительную информацию о клиенте можно указать позже в разделе редактирования проекта
              </p>
            </div>

            {/* Подсказка */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Совет:</strong> После создания проекта вы сможете добавить адрес, бюджет, сроки, команду и другие детали на странице проекта.
              </p>
            </div>

          </div>

          {/* Кнопки действий */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <Link
              href="/projects"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Отмена
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Save size={16} className="mr-2" />
              {isSubmitting ? 'Создание...' : 'Создать проект'}
            </button>
          </div>
        </form>

        {/* Информация о следующих шагах */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Что можно добавить позже:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Адрес объекта</li>
            <li>Бюджет и сроки</li>
            <li>Контактные данные клиента</li>
            <li>Участников команды</li>
            <li>Задачи и файлы</li>
            <li>Счета и расходы</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
