const fs = require('fs');
const path = require('path');

const pageContent = `'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Project, CreateProjectData, ProjectStats, projectStatusMap } from '@/types/project';
import { Task, taskStatusMap } from '@/types/task';
import { expenseCategoryMap } from '@/types/supplier';
import { Building2, Plus, ChevronDown, ChevronUp, CheckSquare, Square, DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface ProjectWithStats extends Project {
  stats: ProjectStats;
  tasks: Task[];
  invoices: any[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
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
      // Загружаем проекты
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Загружаем задачи для всех проектов
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*');

      if (tasksError) throw tasksError;

      // Загружаем счета для всех проектов
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(\`
          *,
          suppliers (
            name,
            category
          )
        \`);

      if (invoicesError) throw invoicesError;

      // Группируем данные по проектам
      const projectsWithStats: ProjectWithStats[] = (projectsData || []).map(project => {
        const projectTasks = (tasksData || []).filter(t => t.project_id === project.id);
        const projectInvoices = (invoicesData || []).filter(i => i.project_id === project.id);

        const completedTasks = projectTasks.filter(t => t.status === 'done').length;
        const totalSpent = projectInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

        // Группировка по категориям
        const categoryMap = new Map<string, number>();
        projectInvoices.forEach(inv => {
          const category = inv.suppliers?.category || 'general';
          const current = categoryMap.get(category) || 0;
          categoryMap.set(category, current + (Number(inv.amount) || 0));
        });

        const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, amount]) => ({
          category,
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
        })).sort((a, b) => b.amount - a.amount);

        const stats: ProjectStats = {
          totalTasks: projectTasks.length,
          completedTasks,
          totalInvoices: projectInvoices.length,
          totalSpent,
          budgetUsage: project.budget ? (totalSpent / project.budget) * 100 : 0,
          categoryBreakdown
        };

        return {
          ...project,
          stats,
          tasks: projectTasks,
          invoices: projectInvoices
        };
      });

      setProjects(projectsWithStats);
    } catch (error) {
      console.error('Ошибка при загрузке проектов:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    try {
      const { error } = await supabase
        .from('projects')
        .insert([newProject]);

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
      alert('Ошибка при создании проекта');
    }
  }

  async function toggleTaskStatus(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      loadProjects();
    } catch (error) {
      console.error('Ошибка при обновлении задачи:', error);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка проектов...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Проекты</h1>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Создать проект
          </button>
        </div>

        {/* Форма создания проекта */}
        {showCreateForm && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Новый проект</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название объекта *
                </label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: ЖК Солнечный"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заказчик *
                </label>
                <input
                  type="text"
                  value={newProject.client}
                  onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Название компании или ФИО"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Адрес
                </label>
                <input
                  type="text"
                  value={newProject.address}
                  onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Адрес объекта"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Срок сдачи
                  </label>
                  <input
                    type="date"
                    value={newProject.due_date}
                    onChange={(e) => setNewProject({ ...newProject, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Бюджет, ₽
                  </label>
                  <input
                    type="number"
                    value={newProject.budget || ''}
                    onChange={(e) => setNewProject({ ...newProject, budget: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание, контакты
              </label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Контакты заказчика, особенности проекта и прочая информация..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={createProject}
                disabled={!newProject.title || !newProject.client || !newProject.address}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Список проектов */}
        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Заголовок проекта */}
              <div
                onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                      <span className={\`px-3 py-1 text-sm rounded-full \${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                        project.status === 'done' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }\`}>
                        {projectStatusMap[project.status]}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">
                      <span className="font-medium">Заказчик:</span> {project.client}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Адрес:</span> {project.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Статистика */}
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Задачи</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {project.stats.completedTasks} / {project.stats.totalTasks}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Потрачено</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(project.stats.totalSpent)}
                      </div>
                    </div>
                    {project.budget && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Бюджет</div>
                        <div className={\`text-lg font-semibold \${
                          project.stats.budgetUsage > 100 ? 'text-red-600' :
                          project.stats.budgetUsage > 80 ? 'text-yellow-600' :
                          'text-green-600'
                        }\`}>
                          {project.stats.budgetUsage.toFixed(0)}%
                        </div>
                      </div>
                    )}
                    {expandedProject === project.id ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Развернутая информация */}
              {expandedProject === project.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Левая колонка - Задачи */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckSquare className="w-5 h-5" />
                        Задачи ({project.tasks.length})
                      </h4>
                      {project.tasks.length === 0 ? (
                        <p className="text-gray-500 text-sm">Задач пока нет</p>
                      ) : (
                        <div className="space-y-2">
                          {project.tasks.map(task => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                            >
                              <button
                                onClick={() => toggleTaskStatus(task.id, task.status)}
                                className="flex-shrink-0"
                              >
                                {task.status === 'done' ? (
                                  <CheckSquare className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                              <div className="flex-1">
                                <p className={\`text-sm \${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}\`}>
                                  {task.title}
                                </p>
                                {task.due_date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Срок: {formatDate(task.due_date)}
                                  </p>
                                )}
                              </div>
                              <span className={\`px-2 py-1 text-xs rounded \${
                                task.status === 'done' ? 'bg-green-100 text-green-800' :
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }\`}>
                                {taskStatusMap[task.status]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Правая колонка - Бюджет по категориям */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Затраты по категориям
                      </h4>
                      {project.stats.categoryBreakdown.length === 0 ? (
                        <p className="text-gray-500 text-sm">Счетов пока нет</p>
                      ) : (
                        <div className="space-y-3">
                          {project.stats.categoryBreakdown.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {expenseCategoryMap[item.category as keyof typeof expenseCategoryMap] || item.category}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: \`\${item.percentage}%\` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {item.percentage.toFixed(1)}% от общих затрат
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Описание */}
                  {project.description && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Описание и контакты</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Проектов пока нет</h3>
            <p className="text-gray-600 mb-4">Создайте первый проект, чтобы начать работу</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Создать проект
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
`;

const filePath = path.join(__dirname, 'src', 'app', 'projects', 'page.tsx');
const dirPath = path.join(__dirname, 'src', 'app', 'projects');

if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

fs.writeFileSync(filePath, pageContent, 'utf8');
console.log('✅ Файл projects/page.tsx создан успешно');
