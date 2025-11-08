const fs = require('fs');
const path = require('path');

const compactProjectsPage = `'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Project, CreateProjectData, projectStatusMap } from '@/types/project';
import { Building2, Plus, ExternalLink } from 'lucide-react';

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
      console.error('Ошибка при загрузке проектов:', error);
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

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select();

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
      console.error('Ошибка при создании проекта:', error);
      alert(\`Ошибка: \${(error as any).message || 'Неизвестная ошибка'}\`);
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
            <span className="text-sm text-gray-500">({projects.length})</span>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Создать
          </button>
        </div>

        {/* Форма создания */}
        {showCreateForm && (
          <div className="mb-4 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Новый проект</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="Название объекта *"
              />
              <input
                type="text"
                value={newProject.client}
                onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="Заказчик *"
              />
              <input
                type="text"
                value={newProject.address}
                onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="Адрес"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newProject.due_date}
                  onChange={(e) => setNewProject({ ...newProject, due_date: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="number"
                  value={newProject.budget || ''}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value ? Number(e.target.value) : undefined })}
                  className="px-3 py-2 border rounded-lg text-sm"
                  placeholder="Бюджет"
                />
              </div>
            </div>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
              placeholder="Описание, контакты..."
            />
            <div className="flex gap-2">
              <button
                onClick={createProject}
                disabled={!newProject.title || !newProject.client}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm"
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Компактная таблица проектов */}
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Проект</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Заказчик</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Адрес</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Статус</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Срок</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Бюджет</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(\`/projects/\${project.id}\`)}>
                    <td className="px-3 py-2 font-medium text-gray-900">{project.title}</td>
                    <td className="px-3 py-2 text-gray-600">{project.client}</td>
                    <td className="px-3 py-2 text-gray-600">{project.address || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={\`px-2 py-1 text-xs rounded-full \${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                        project.status === 'done' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }\`}>
                        {projectStatusMap[project.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{formatDate(project.due_date)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {project.budget ? \`\${project.budget.toLocaleString('ru-RU')} ₽\` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ExternalLink className="w-4 h-4 text-gray-400 inline-block" />
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

const filePath = path.join(__dirname, 'src', 'app', 'projects', 'page.tsx');
fs.writeFileSync(filePath, compactProjectsPage, 'utf8');
console.log('✅ Компактная страница проектов создана');
