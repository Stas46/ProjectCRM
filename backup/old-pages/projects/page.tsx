'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building, MapPin, Calendar, Clock } from 'lucide-react';
import AppLayout from '@/components/app-layout';
import { getAllProjects } from '@/services/projects';
import { Project } from '@/types/project';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const data = await getAllProjects();
        setProjects(data);
        setError(null);
      } catch (err: any) {
        console.error('Ошибка при загрузке проектов:', err);
        setError(err.message || 'Не удалось загрузить проекты');
      } finally {
        setLoading(false);
      }
    };
    
    loadProjects();
  }, []);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };
  
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string, color: string }> = {
      planning: { label: 'Планирование', color: 'bg-purple-100 text-purple-800' },
      active: { label: 'Активен', color: 'bg-green-100 text-green-800' },
      on_hold: { label: 'На паузе', color: 'bg-yellow-100 text-yellow-800' },
      done: { label: 'Завершен', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Отменен', color: 'bg-red-100 text-red-800' },
    };
    
    return statusMap[status] || { label: 'Неизвестно', color: 'bg-gray-100 text-gray-800' };
  };
  
  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AppLayout>
    );
  }
  
  if (error) {
    return (
      <AppLayout>
        <div className="p-4">
          <div className="flex items-center mb-6">
            <Link href="/" className="text-gray-500 hover:text-blue-600">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 ml-4">Проекты</h1>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h2 className="text-lg font-medium text-red-800 mb-2">Произошла ошибка</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex items-center mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 ml-4">Проекты</h1>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Проекты не найдены</p>
            <Link
              href="/projects/new"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Создать новый проект
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {projects.map((project) => {
              const statusInfo = getStatusInfo(project.status);
              
              return (
                <Link key={project.id} href={`/projects/detail/${project.id}`}>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-lg font-medium text-gray-900">{project.title}</h2>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-4">{project.address}</div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-start">
                        <MapPin size={16} className="text-gray-400 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700">{project.address}</span>
                      </div>
                      
                      {project.due_date && (
                        <div className="flex items-start">
                          <Calendar size={16} className="text-gray-400 mr-2 mt-0.5" />
                          <span className="text-sm text-gray-700">Срок: {formatDate(project.due_date)}</span>
                        </div>
                      )}
                      
                      {project.budget && (
                        <div className="flex items-start">
                          <Clock size={16} className="text-gray-400 mr-2 mt-0.5" />
                          <span className="text-sm text-gray-700">Бюджет: {formatCurrency(project.budget)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}