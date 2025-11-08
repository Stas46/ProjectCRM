const fs = require('fs');
const path = require('path');

// 1. Главная страница - компактное меню
const homePage = `export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">CRM Система</h1>
        </div>
      </div>

      {/* Главное меню */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/projects"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏗️</span>
              <h2 className="text-lg font-semibold text-gray-900">Проекты</h2>
            </div>
            <p className="text-sm text-gray-600">Управление заказами и задачами</p>
          </a>

          <a
            href="/invoices"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📄</span>
              <h2 className="text-lg font-semibold text-gray-900">Счета</h2>
            </div>
            <p className="text-sm text-gray-600">Загрузка и распознавание счетов</p>
          </a>

          <a
            href="/suppliers"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏢</span>
              <h2 className="text-lg font-semibold text-gray-900">Поставщики</h2>
            </div>
            <p className="text-sm text-gray-600">База поставщиков и аналитика</p>
          </a>
        </div>
      </div>
    </div>
  );
}
`;

// 2. Компактная страница проектов
const projectsPage = `'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Project, CreateProjectData, projectStatusMap } from '@/types/project';
import { Building2, Plus, Home } from 'lucide-react';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState<CreateProjectData>({
    title: '',
    client: '',
    address: '',
    status: 'planning',
    description: '',
    due_date: '',
    budget: undefined
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    try {
      const projectData = {
        ...newProject,
        due_date: newProject.due_date || null,
        budget: newProject.budget || null,
        address: newProject.address || null,
        description: newProject.description || null
      };

      const { error } = await supabase
        .from('projects')
        .insert([projectData]);

      if (error) throw error;

      setShowCreateForm(false);
      setNewProject({
        title: '',
        client: '',
        address: '',
        status: 'planning',
        description: '',
        due_date: '',
        budget: undefined
      });
      loadProjects();
    } catch (error) {
      alert(\`Ошибка: \${(error as any).message}\`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-600 hover:text-gray-900">
              <Home className="w-5 h-5" />
            </a>
            <Building2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Проекты</h1>
            <span className="text-sm text-gray-500">({projects.length})</span>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Создать
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Форма создания */}
        {showCreateForm && (
          <div className="mb-4 bg-white rounded-lg shadow-sm p-4 border">
            <div className="grid grid-cols-4 gap-3 mb-3">
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                className="px-3 py-1.5 border rounded-lg text-sm"
                placeholder="Название *"
              />
              <input
                type="text"
                value={newProject.client}
                onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                className="px-3 py-1.5 border rounded-lg text-sm"
                placeholder="Заказчик *"
              />
              <input
                type="text"
                value={newProject.address}
                onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                className="px-3 py-1.5 border rounded-lg text-sm"
                placeholder="Адрес"
              />
              <input
                type="number"
                value={newProject.budget || ''}
                onChange={(e) => setNewProject({ ...newProject, budget: e.target.value ? Number(e.target.value) : undefined })}
                className="px-3 py-1.5 border rounded-lg text-sm"
                placeholder="Бюджет"
              />
            </div>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-1.5 border rounded-lg text-sm mb-3"
              placeholder="Описание, контакты..."
            />
            <div className="flex gap-2">
              <button
                onClick={createProject}
                disabled={!newProject.title || !newProject.client}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm"
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Таблица */}
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">Проектов пока нет</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Создать первый проект
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Проект</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Заказчик</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Адрес</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Статус</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Бюджет</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projects.map((project) => (
                  <tr 
                    key={project.id} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onClick={() => router.push(\`/projects/\${project.id}\`)}
                  >
                    <td className="px-3 py-2 font-medium text-gray-900">{project.title}</td>
                    <td className="px-3 py-2 text-gray-600">{project.client}</td>
                    <td className="px-3 py-2 text-gray-600 text-sm">{project.address || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={\`px-2 py-0.5 text-xs rounded-full \${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                        project.status === 'done' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }\`}>
                        {projectStatusMap[project.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {project.budget ? \`\${(project.budget / 1000).toFixed(0)}к ₽\` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
`;

// Сохраняем файлы
fs.writeFileSync(path.join(__dirname, 'src', 'app', 'page.tsx'), homePage, 'utf8');
fs.writeFileSync(path.join(__dirname, 'src', 'app', 'projects', 'page.tsx'), projectsPage, 'utf8');

console.log('✅ Главная страница обновлена');
console.log('✅ Страница проектов обновлена');
console.log('\\n📋 Компактный дизайн:');
console.log('  - Минимальные отступы');
console.log('  - Таблица вместо карточек');
console.log('  - Навигация в шапке');
console.log('  - Бюджет в тысячах (123к ₽)');
