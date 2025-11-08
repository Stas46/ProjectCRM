'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppLayout from '@/components/app-layout';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createEmployee } from '@/services/employees';

// Схема валидации формы
const employeeSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать не менее 2 символов'),
  position: z.string().min(2, 'Должность должна содержать не менее 2 символов'),
  email: z.string().email('Введите корректный email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'installer', 'worker']),
  is_active: z.boolean().optional().default(true),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function NewEmployeePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    register, 
    handleSubmit: hookFormSubmit, 
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      name: '',
      position: '',
      email: '',
      phone: '',
      role: 'worker' as const,
      is_active: true
    },
    resolver: zodResolver(employeeSchema)
  });
  
  const watchIsActive = watch('is_active');
  
  const handleSubmit = hookFormSubmit((data: any) => onSubmit(data as EmployeeFormData));
  
  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await createEmployee(data);
      router.push('/employees');
      
    } catch (err) {
      console.error('Ошибка при создании сотрудника:', err);
      setError('Не удалось создать сотрудника. Попробуйте еще раз.');
      setIsSubmitting(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/employees" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Вернуться к списку сотрудников
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
            <h1 className="text-xl font-semibold text-gray-900">Добавление нового сотрудника</h1>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
              <FormField
                label="ФИО сотрудника"
                name="name"
                error={errors.name?.message}
                required
              >
                <Input
                  id="name"
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  error={!!errors.name}
                  {...register('name')}
                />
              </FormField>
              
              <FormField
                label="Должность"
                name="position"
                error={errors.position?.message}
                required
              >
                <Input
                  id="position"
                  type="text"
                  placeholder="Старший монтажник"
                  error={!!errors.position}
                  {...register('position')}
                />
              </FormField>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Email"
                  name="email"
                  error={errors.email?.message}
                >
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    error={!!errors.email}
                    {...register('email')}
                  />
                </FormField>
                
                <FormField
                  label="Телефон"
                  name="phone"
                  error={errors.phone?.message}
                >
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    error={!!errors.phone}
                    {...register('phone')}
                  />
                </FormField>
              </div>
              
              <FormField
                label="Роль в системе"
                name="role"
                error={errors.role?.message}
                required
              >
                <Select
                  defaultValue="worker"
                  onValueChange={(value) => setValue('role', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="manager">Менеджер</SelectItem>
                    <SelectItem value="installer">Монтажник</SelectItem>
                    <SelectItem value="worker">Рабочий</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              
              <FormField
                name="is_active"
              >
                <div className="flex items-center">
                  <Checkbox
                    id="is_active"
                    checked={watchIsActive}
                    label="Активный сотрудник"
                    description="Неактивные сотрудники не могут быть назначены на задачи"
                    onChange={(e) => setValue('is_active', e.target.checked)}
                  />
                </div>
              </FormField>
              
              <div className="pt-4 flex justify-end space-x-3">
                <Link href="/employees">
                  <Button type="button" variant="outline">
                    Отмена
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Создать сотрудника'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}