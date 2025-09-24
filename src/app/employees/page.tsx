'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  Loader2, 
  UserCog, 
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { getAllEmployees } from '@/services/employees';
import { Employee } from '@/types/employee';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Загрузка сотрудников
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        const data = await getAllEmployees();
        setEmployees(data);
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке сотрудников:', err);
        setError('Не удалось загрузить список сотрудников');
      } finally {
        setLoading(false);
      }
    };
    
    loadEmployees();
  }, []);
  
  // Фильтрация сотрудников
  const filteredEmployees = employees.filter(employee => {
    // Поиск по имени или должности
    const matchesSearch = !searchQuery || 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      employee.position.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Фильтр по роли
    const matchesRole = !roleFilter || employee.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
  
  // Преобразование роли в человекочитаемый формат
  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'installer': return 'Монтажник';
      case 'worker': return 'Рабочий';
      default: return role;
    }
  };
  
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Сотрудники</h1>
          <Link href="/employees/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить сотрудника
            </Button>
          </Link>
        </div>
        
        {/* Фильтры и поиск */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Поиск по имени или должности"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex">
              <div className="relative">
                <select
                  className="block appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={roleFilter || ''}
                  onChange={(e) => setRoleFilter(e.target.value || null)}
                >
                  <option value="">Все роли</option>
                  <option value="admin">Администраторы</option>
                  <option value="manager">Менеджеры</option>
                  <option value="installer">Монтажники</option>
                  <option value="worker">Рабочие</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <Filter className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Список сотрудников */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={40} className="animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <UserCog size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки</h3>
            <p className="text-sm text-gray-500 mb-6">
              {error}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Обновить страницу
            </Button>
          </div>
        
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <UserCog size={28} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Сотрудники не найдены</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchQuery || roleFilter 
                ? 'Попробуйте изменить параметры поиска'
                : 'Добавьте своего первого сотрудника'}
            </p>
            <Link href="/employees/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить сотрудника
              </Button>
            </Link>
          </div>
        
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {filteredEmployees.map(employee => (
                <li key={employee.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Avatar 
                          name={employee.name} 
                          src={employee.avatar_url} 
                          size="lg" 
                        />
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">{employee.name}</h3>
                          <p className="text-sm text-gray-500">{employee.position}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                          {getRoleName(employee.role)}
                        </div>
                        {employee.is_active ? (
                          <div className="flex items-center text-green-700 text-xs">
                            <UserCheck className="h-4 w-4 mr-1" />
                            Активен
                          </div>
                        ) : (
                          <div className="text-gray-500 text-xs">Неактивен</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 sm:flex sm:justify-between">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {employee.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        {employee.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            <span>{employee.email}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                        <Link 
                          href={`/employees/${employee.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Подробнее
                        </Link>
                        <div className="text-gray-300">|</div>
                        <Link 
                          href={`/employees/${employee.id}/edit`}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppLayout>
  );
}