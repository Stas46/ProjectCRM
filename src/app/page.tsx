'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import ProjectCard from '@/components/project-card';
import { Plus, Search, CalendarDays, Filter, ArrowUpDown, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getAllProjects } from '@/services/projects';
import { Project } from '@/types/project';
import { getProjectStats } from '@/services/projects';

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectStats, setProjectStats] = useState<Record<string, { tasksCount: number; tasksCompleted: number }>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Загрузка проектов
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const data = await getAllProjects();
        setProjects(data);
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке проектов:', err);
        setError('Не удалось загрузить проекты');
      } finally {
        setLoading(false);
      }
    };
    
    loadProjects();
  }, []);
  
  // Загрузка статистики для проектов
  useEffect(() => {
    const loadStats = async () => {
      const stats: Record<string, { tasksCount: number; tasksCompleted: number }> = {};
      
      for (const project of projects) {
        const projectStats = await getProjectStats(project.id);
        stats[project.id] = projectStats;
      }
      
      setProjectStats(stats);
    };
    
    if (projects.length > 0) {
      loadStats();
    }
  }, [projects]);
  
  // Фильтрация проектов по поиску и статусу
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter) {
      return matchesSearch && project.status === statusFilter;
    }
    
    return matchesSearch;
  });

  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
          
          <Link
            href="/projects/new"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
          >
            <Plus size={16} className="mr-2" />
            Новый проект
          </Link>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              placeholder="Поиск проектов..."
            />
          </div>
        </div>
        
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <Filter size={16} className="mr-1.5" />
            Фильтры
          </button>
          
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <ArrowUpDown size={16} className="mr-1.5" />
            Сортировка
          </button>
          
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <CalendarDays size={16} className="mr-1.5" />
            По дате
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={40} className="animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <FileText size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки</h3>
            <p className="text-sm text-gray-500 mb-6">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            >
              Обновить страницу
            </button>
          </div>
        
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <FileText size={28} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Проекты не найдены</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchQuery || statusFilter 
                ? 'Попробуйте изменить параметры поиска'
                : 'У вас пока нет проектов. Создайте свой первый проект'}
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            >
              <Plus size={16} className="mr-2" />
              Новый проект
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                id={project.id}
                title={project.title}
                client={project.client}
                address={project.address}
                status={project.status}
                dueDate={project.due_date}
                budget={project.budget}
                tasksCount={projectStats[project.id]?.tasksCount || 0}
                tasksCompleted={projectStats[project.id]?.tasksCompleted || 0}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}