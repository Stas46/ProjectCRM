const fs = require('fs');
const path = require('path');

const projectDetailPage = `'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Home, ArrowLeft, Edit, Plus, CheckCircle2, Circle, FileText, TrendingUp } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  client_name: string;
  address: string | null;
  description: string | null;
  budget: number | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number | null;
  suppliers?: {
    name: string;
    category: string;
  };
}

const statusColors = {
  planning: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  done: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels = {
  planning: 'Планирование',
  active: 'В работе',
  on_hold: 'Приостановлен',
  done: 'Завершен',
  cancelled: 'Отменен',
};

const priorityColors = {
  low: 'text-gray-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('@/lib/supabase');

      const [projectRes, tasksRes, invoicesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select(\\\`
            *,
            suppliers (
              name,
              category
            )
          \\\`)
          .eq('project_id', projectId)
          .order('invoice_date', { ascending: false }),
      ]);

      if (projectRes.error) throw projectRes.error;
      setProject(projectRes.data);
      setTasks(tasksRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (err) {
      console.error('Ошибка:', err);
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Проект не найден</p>
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Вернуться к проектам
          </button>
        </div>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const budgetUsed = project.budget ? Math.round((totalInvoices / project.budget) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-600 hover:text-gray-900">
              <Home className="w-5 h-5" />
            </a>
            <button onClick={() => router.push('/projects')} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
            <span className={\\\`px-2 py-0.5 text-xs rounded \\\${statusColors[project.status as keyof typeof statusColors]}\\\`}>
              {statusLabels[project.status as keyof typeof statusLabels]}
            </span>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Edit className="w-4 h-4" />
            Редактировать
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Основная информация */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Клиент</div>
              <div className="font-medium text-gray-900">{project.client_name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Адрес</div>
              <div className="font-medium text-gray-900">{project.address || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Бюджет</div>
              <div className="font-medium text-gray-900">
                {project.budget ? \\\`\\\${(project.budget / 1000).toFixed(1)}к ₽\\\` : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Срок</div>
              <div className="font-medium text-gray-900">
                {project.due_date ? new Date(project.due_date).toLocaleDateString('ru-RU') : '—'}
              </div>
            </div>
          </div>
          {project.description && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-gray-500 mb-1">Описание</div>
              <div className="text-sm text-gray-700">{project.description}</div>
            </div>
          )}
        </div>

        {/* Статистика */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Прогресс задач */}
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Прогресс задач</h3>
              <span className="text-sm text-gray-600">{completedTasks} из {totalTasks}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: \\\`\\\${progressPercent}%\\\` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{progressPercent}%</div>
          </div>

          {/* Использование бюджета */}
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Использование бюджета</h3>
              <span className="text-sm text-gray-600">
                {(totalInvoices / 1000).toFixed(1)}к из {project.budget ? (project.budget / 1000).toFixed(1) : '?'}к ₽
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={\\\`h-2 rounded-full transition-all \\\${budgetUsed > 90 ? 'bg-red-600' : budgetUsed > 70 ? 'bg-yellow-600' : 'bg-blue-600'}\\\`}
                style={{ width: \\\`\\\${Math.min(budgetUsed, 100)}%\\\` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{budgetUsed}%</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Задачи */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Задачи ({tasks.length})</h2>
              <button className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Задач пока нет
                </div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="p-3 hover:bg-gray-50 flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.status)}
                      className="mt-0.5 text-gray-400 hover:text-gray-600"
                    >
                      {task.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={\\\`text-sm font-medium \\\${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}\\\`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-gray-600 mt-1">{task.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={\\\`text-xs \\\${priorityColors[task.priority]}\\\`}>
                          {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-gray-500">
                            {new Date(task.due_date).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Счета */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Счета ({invoices.length})</h2>
              <div className="text-sm text-gray-600">
                {(totalInvoices / 1000).toFixed(1)}к ₽
              </div>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {invoices.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Счетов пока нет
                </div>
              ) : (
                invoices.map(invoice => (
                  <div key={invoice.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {invoice.suppliers?.name || '—'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.total_amount ? \\\`\\\${(invoice.total_amount / 1000).toFixed(1)}к ₽\\\` : '—'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(
  path.join(__dirname, 'src', 'app', 'projects', '[id]', 'page.tsx'),
  projectDetailPage,
  'utf8'
);
console.log('✅ Страница просмотра проекта создана');
