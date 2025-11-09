'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, FolderOpen, Plus, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  client: string;
  address: string | null;
  description: string | null;
  budget: number | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

const statusConfig = {
  planning: { label: 'Планирование', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  active: { label: 'В работе', color: 'bg-green-100 text-green-700 border-green-200' },
  on_hold: { label: 'Приостановлен', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  done: { label: 'Завершен', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  cancelled: { label: 'Отменен', color: 'bg-red-100 text-red-700 border-red-200' },
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    client: '',
    address: '',
    description: '',
    budget: '',
    status: 'planning' as const,
    due_date: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const { supabase } = await import('@/lib/supabase');

      const projectData = {
        title: formData.title,
        client: formData.client,
        address: formData.address || null,
        description: formData.description || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        status: formData.status,
        due_date: formData.due_date || null,
      };

      const { error } = await supabase.from('projects').insert([projectData]);
      if (error) throw error;

      setFormData({
        title: '',
        client: '',
        address: '',
        description: '',
        budget: '',
        status: 'planning',
        due_date: '',
      });
      setShowForm(false);
      await loadProjects();
    } catch (err) {
      console.error('Ошибка:', err);
      alert('Ошибка при создании проекта');
    } finally {
      setCreating(false);
    }
  };

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
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Проекты</h1>
            <span className="text-sm text-gray-500">({projects.length})</span>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Создать проект
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Форма создания */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
            <h2 className="font-semibold text-gray-900 mb-3">Новый проект</h2>
            <form onSubmit={createProject} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Название проекта <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Название"
                  />
                </div>
                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Клиент</label>
                <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    value={formData.client}
                    onChange={e => setFormData({ ...formData, client: e.target.value })}
                    required
                />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Адрес</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Адрес объекта"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Бюджет (₽)</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Бюджет"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Срок</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Описание проекта"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Статус</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="planning">Планирование</option>
                  <option value="active">В работе</option>
                  <option value="on_hold">Приостановлен</option>
                  <option value="done">Завершен</option>
                  <option value="cancelled">Отменен</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                >
                  {creating ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Список проектов */}
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">Проектов пока нет</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Создать первый проект
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-lg">{project.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded border ${statusConfig[project.status as keyof typeof statusConfig].color}`}>
                      {statusConfig[project.status as keyof typeof statusConfig].label}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">👤</span>
                      {project.client}
                    </div>
                    {project.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">📍</span>
                        {project.address}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    {project.budget && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-500">Бюджет</div>
                          <div className="text-sm font-medium text-gray-900">
                            {(project.budget / 1000).toFixed(1)}к ₽
                          </div>
                        </div>
                      </div>
                    )}
                    {project.due_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-500">Срок</div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(project.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {project.status === 'done' && (
                  <div className="bg-green-50 px-4 py-2 flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Проект завершен
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
