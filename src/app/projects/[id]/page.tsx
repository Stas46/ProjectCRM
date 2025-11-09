'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Home, ArrowLeft, Edit, Plus, CheckCircle2, Circle, FileText, X, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { expenseCategoryMap, SupplierCategory } from '@/types/supplier';

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

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'done';
  priority: number; // 1 = high, 2 = medium, 3 = low
  due_date: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number | null;
  vat_amount?: number | null;
  file_url?: string | null;
  created_at?: string;
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

const priorityLabels = {
  1: { label: 'Высокий', color: 'text-red-600' },
  2: { label: 'Средний', color: 'text-yellow-600' },
  3: { label: 'Низкий', color: 'text-gray-600' },
};

const priorityColors = {
  low: 'text-gray-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

const categoryColors: Record<string, string> = {
  'profiles': 'bg-green-100 text-green-700 border-green-200',
  'glass_units': 'bg-blue-100 text-blue-700 border-blue-200',
  'fittings': 'bg-purple-100 text-purple-700 border-purple-200',
  'accessories': 'bg-pink-100 text-pink-700 border-pink-200',
  'lifting': 'bg-orange-100 text-orange-700 border-orange-200',
  'installation': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'logistics': 'bg-teal-100 text-teal-700 border-teal-200',
  'manufacturing': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'fasteners': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'painting': 'bg-rose-100 text-rose-700 border-rose-200',
  'trim_strips': 'bg-amber-100 text-amber-700 border-amber-200',
  'design': 'bg-violet-100 text-violet-700 border-violet-200',
  'brackets': 'bg-lime-100 text-lime-700 border-lime-200',
  'other': 'bg-gray-100 text-gray-700 border-gray-200',
  'additional_work': 'bg-sky-100 text-sky-700 border-sky-200',
  'general': 'bg-slate-100 text-slate-700 border-slate-200',
};

// Используем правильный маппинг категорий из типов
const categoryLabels = expenseCategoryMap;

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showInvoiceSelect, setShowInvoiceSelect] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  const [editData, setEditData] = useState({
    title: '',
    client: '',
    address: '',
    description: '',
    budget: '',
    status: 'planning' as Project['status'],
    due_date: '',
  });

  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 2, // medium по умолчанию
    due_date: '',
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'finance'>('tasks');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesLastSaved, setNotesLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('@/lib/supabase');

      console.log('🔄 Загрузка проекта:', projectId);

      const [projectRes, tasksRes, invoicesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('invoices').select('id, invoice_number, invoice_date, total_amount, vat_amount, file_url, project_id, supplier_id, created_at').eq('project_id', projectId).order('created_at', { ascending: false }),
      ]);

      if (projectRes.error) {
        console.error('❌ Ошибка загрузки проекта:', projectRes.error);
        throw projectRes.error;
      }
      if (tasksRes.error) {
        console.error('❌ Ошибка загрузки задач:', tasksRes.error);
      }
      if (invoicesRes.error) {
        console.error('❌ Ошибка загрузки счетов:', invoicesRes.error);
        console.error('❌ Детали ошибки:', JSON.stringify(invoicesRes.error, null, 2));
      }
      
      console.log('🔍 Raw invoicesRes:', invoicesRes);
      console.log('🔍 invoicesRes.status:', invoicesRes.status);
      console.log('🔍 invoicesRes.statusText:', invoicesRes.statusText);

      console.log('✅ Проект загружен:', projectRes.data);
      console.log('✅ Задачи загружены:', tasksRes.data?.length || 0);
      console.log('✅ Счета загружены:', invoicesRes.data?.length || 0);
      console.log('📋 Счета:', invoicesRes.data);

      // Загружаем информацию о поставщиках для счетов
      const invoicesWithSuppliers = (invoicesRes.data || []) as Invoice[];
      if (invoicesWithSuppliers.length > 0) {
        const supplierIds = [...new Set(invoicesWithSuppliers.map(inv => (inv as any).supplier_id).filter(Boolean))];
        if (supplierIds.length > 0) {
          const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id, name, category')
            .in('id', supplierIds);
          
          console.log('✅ Поставщики загружены:', suppliers?.length || 0);
          console.log('📋 Данные поставщиков:', suppliers);
          
          // Добавляем информацию о поставщиках к счетам
          invoicesWithSuppliers.forEach(invoice => {
            const inv = invoice as any;
            if (inv.supplier_id) {
              invoice.suppliers = suppliers?.find(s => s.id === inv.supplier_id);
              console.log(`Счёт ${invoice.invoice_number}: поставщик ${invoice.suppliers?.name}, категория ${invoice.suppliers?.category}`);
            }
          });
        }
      }

      setProject(projectRes.data);
      setTasks(tasksRes.data || []);
      setInvoices(invoicesWithSuppliers);
      setNotes((projectRes.data as any).notes || ''); // Загружаем заметки
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

  const saveNotes = async (notesText: string) => {
    try {
      setIsSavingNotes(true);
      const { supabase } = await import('@/lib/supabase');

      const { error } = await supabase
        .from('projects')
        .update({ notes: notesText })
        .eq('id', projectId);

      if (error) throw error;

      setNotesLastSaved(new Date());
    } catch (err) {
      console.error('Ошибка сохранения заметок:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Автосохранение заметок через 2 секунды после последнего изменения
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== ((project as any)?.notes || '')) {
        saveNotes(notes);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [notes]);


  const openEditForm = () => {
    if (!project) return;
    setEditData({
      title: project.title,
      client: project.client,
      address: project.address || '',
      description: project.description || '',
      budget: project.budget?.toString() || '',
      status: project.status as Project['status'],
      due_date: project.due_date || '',
    });
    setShowEditForm(true);
  };

  const updateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const updateData = {
        title: editData.title,
        client: editData.client,
        address: editData.address || null,
        description: editData.description || null,
        budget: editData.budget ? parseFloat(editData.budget) : null,
        status: editData.status,
        due_date: editData.due_date || null,
      };

      // Отправляем на сервер для логирования
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'UPDATE_PROJECT',
          projectId,
          data: updateData 
        })
      });

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select();

      if (error) {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'UPDATE_PROJECT_ERROR',
            error: JSON.stringify(error)
          })
        });
        throw error;
      }

      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'UPDATE_PROJECT_SUCCESS',
          data: data
        })
      });

      await loadProjectData();
      setShowEditForm(false);
    } catch (err) {
      console.error('Ошибка обновления:', err);
      alert(`Ошибка при обновлении проекта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingTask) return; // Защита от двойных кликов
    
    try {
      setIsCreatingTask(true);
      const { supabase } = await import('@/lib/supabase');

      const newTask = {
        project_id: projectId,
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority,
        due_date: taskData.due_date || null,
        status: 'todo' as const,
      };

      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'CREATE_TASK',
          data: newTask
        })
      });

      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select();

      if (error) {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'CREATE_TASK_ERROR',
            error: JSON.stringify(error)
          })
        });
        throw error;
      }

      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'CREATE_TASK_SUCCESS',
          data: data
        })
      });

      setTaskData({
        title: '',
        description: '',
        priority: 2,
        due_date: '',
      });
      setShowTaskForm(false);
      await loadProjectData();
    } catch (err) {
      console.error('Ошибка создания задачи:', err);
      alert(`Ошибка при создании задачи: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const loadAvailableInvoices = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*, suppliers(name, category)')
        .is('project_id', null)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      setAvailableInvoices(data || []);
      setShowInvoiceSelect(true);
    } catch (err) {
      console.error('Ошибка загрузки счетов:', err);
    }
  };

  const linkInvoiceToProject = async (invoiceId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');

      const { error } = await supabase
        .from('invoices')
        .update({ project_id: projectId })
        .eq('id', invoiceId);

      if (error) throw error;

      await loadProjectData();
      setShowInvoiceSelect(false);
    } catch (err) {
      console.error('Ошибка привязки счета:', err);
      alert('Ошибка при привязке счета');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Удалить эту задачу?')) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Ошибка удаления задачи:', err);
      alert('Ошибка при удалении задачи');
    }
  };

  const unlinkInvoice = async (invoiceId: string) => {
    if (!confirm('Отвязать этот счет от проекта?')) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');

      const { error } = await supabase
        .from('invoices')
        .update({ project_id: null })
        .eq('id', invoiceId);

      if (error) throw error;

      await loadProjectData();
      setSelectedInvoices(new Set()); // Очищаем выделение
    } catch (err) {
      console.error('Ошибка отвязки счета:', err);
      alert('Ошибка при отвязке счета');
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelection = new Set(selectedInvoices);
    if (newSelection.has(invoiceId)) {
      newSelection.delete(invoiceId);
    } else {
      newSelection.add(invoiceId);
    }
    setSelectedInvoices(newSelection);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const allFiles = Array.from(e.dataTransfer.files);
    
    // Логирование для отладки
    console.log('📎 Перетащено файлов:', allFiles.length);
    allFiles.forEach((file, idx) => {
      console.log(`  Файл ${idx + 1}: "${file.name}", type: "${file.type}", size: ${file.size}`);
    });

    // Поддерживаемые форматы
    const supportedExtensions = ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
    const supportedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain'
    ];

    const validFiles = allFiles.filter(file => {
      const ext = file.name.toLowerCase();
      const hasValidExtension = supportedExtensions.some(validExt => ext.endsWith(validExt));
      const hasValidMimeType = supportedMimeTypes.includes(file.type);
      return hasValidExtension || hasValidMimeType;
    });

    const invalidFiles = allFiles.filter(file => {
      const ext = file.name.toLowerCase();
      const hasValidExtension = supportedExtensions.some(validExt => ext.endsWith(validExt));
      const hasValidMimeType = supportedMimeTypes.includes(file.type);
      return !(hasValidExtension || hasValidMimeType);
    });

    console.log('✅ Допустимых файлов:', validFiles.length);
    console.log('❌ Неподдерживаемых файлов:', invalidFiles.length);

    if (validFiles.length === 0) {
      alert('Поддерживаются только файлы: PDF, Excel (.xls, .xlsx), Word (.doc, .docx), изображения (.jpg, .png), текст (.txt)');
      return;
    }

    if (invalidFiles.length > 0) {
      const proceed = confirm(
        `Найдено ${invalidFiles.length} неподдерживаемых файлов. Загрузить только допустимые файлы (${validFiles.length} шт.)?`
      );
      if (!proceed) return;
    }

    await uploadInvoices(validFiles);
  };

  const uploadInvoices = async (files: File[]) => {
    try {
      setUploading(true);
      setUploadProgress(`Загрузка ${files.length} файлов...`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Обработка ${i + 1} из ${files.length}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId as string);

        const response = await fetch('/api/smart-invoice', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Ошибка обработки ${file.name}: ${error}`);
        }

        const result = await response.json();
        console.log(`✅ Счёт ${file.name} обработан:`, result);
      }

      setUploadProgress('Все файлы успешно загружены!');
      setTimeout(() => {
        setUploadProgress('');
        setUploading(false);
      }, 2000);

      await loadProjectData();
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      alert(err instanceof Error ? err.message : 'Ошибка при загрузке счетов');
      setUploading(false);
      setUploadProgress('');
    }
  };

  const toggleAllInvoices = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map(inv => inv.id)));
    }
  };

  const unlinkSelectedInvoices = async () => {
    if (selectedInvoices.size === 0) return;
    if (!confirm(`Отвязать выбранные счета (${selectedInvoices.size} шт.) от проекта?`)) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');

      const { error } = await supabase
        .from('invoices')
        .update({ project_id: null })
        .in('id', Array.from(selectedInvoices));

      if (error) throw error;

      await loadProjectData();
      setSelectedInvoices(new Set());
    } catch (err) {
      console.error('Ошибка отвязки счетов:', err);
      alert('Ошибка при отвязке счетов');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allFiles = Array.from(files);
    await uploadInvoices(allFiles);
    
    // Очищаем input для возможности повторной загрузки тех же файлов
    e.target.value = '';
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

  // Группировка счетов по категориям
  const categoryBreakdown = invoices.reduce((acc, invoice) => {
    const category = invoice.suppliers?.category || 'Без категории';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += invoice.total_amount || 0;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Топ-5 категорий

  // Фильтрация счетов
  const filteredInvoices = categoryFilter 
    ? invoices.filter(inv => inv.suppliers?.category === categoryFilter)
    : invoices;

  // Список уникальных категорий с количеством счетов
  const categoriesWithCounts = Object.entries(
    invoices.reduce((acc, inv) => {
      const cat = inv.suppliers?.category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Мобильный хедер - вертикальная компоновка */}
          <div className="md:hidden space-y-3">
            {/* Строка 1: Навигация */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a href="/" className="text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <Home className="w-5 h-5" />
                </a>
                <button onClick={() => router.push('/projects')} className="text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <button onClick={openEditForm} className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Edit className="w-5 h-5" />
              </button>
            </div>
            
            {/* Строка 2: Заголовок */}
            <div>
              <h1 className="text-lg font-bold text-gray-900 break-words">{project.title}</h1>
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${statusColors[project.status as keyof typeof statusColors]}`}>
                {statusLabels[project.status as keyof typeof statusLabels]}
              </span>
            </div>
            
            {/* Строка 3: Вкладки */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'tasks'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 <span className="hidden sm:inline">Задачи</span>
              </button>
              <button
                onClick={() => setActiveTab('finance')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'finance'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 <span className="hidden sm:inline">Финансы</span>
              </button>
            </div>
          </div>

          {/* Десктопный хедер - горизонтальная компоновка */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <Home className="w-5 h-5" />
              </a>
              <button onClick={() => router.push('/projects')} className="text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
              <span className={`px-2 py-0.5 text-xs rounded ${statusColors[project.status as keyof typeof statusColors]}`}>
                {statusLabels[project.status as keyof typeof statusLabels]}
              </span>
            </div>
            
            {/* Вкладки */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'tasks'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 Задачи и процесс
              </button>
              <button
                onClick={() => setActiveTab('finance')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'finance'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 Финансы и счета
              </button>
            </div>
            
            <button onClick={openEditForm} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm min-h-[44px]">
              <Edit className="w-4 h-4" />
              Редактировать
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Форма редактирования */}
        {showEditForm && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
            <h2 className="font-semibold text-gray-900 mb-3">Редактирование проекта</h2>
            <form onSubmit={updateProject} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Название проекта *</label>
                  <input
                    type="text"
                    required
                    value={editData.title}
                    onChange={e => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Клиент *</label>
                  <input
                    type="text"
                    required
                    value={editData.client}
                    onChange={e => setEditData({ ...editData, client: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Адрес</label>
                  <input
                    type="text"
                    value={editData.address}
                    onChange={e => setEditData({ ...editData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Бюджет (₽)</label>
                  <input
                    type="number"
                    value={editData.budget}
                    onChange={e => setEditData({ ...editData, budget: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Срок</label>
                  <input
                    type="date"
                    value={editData.due_date}
                    onChange={e => setEditData({ ...editData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Описание</label>
                <textarea
                  value={editData.description}
                  onChange={e => setEditData({ ...editData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Статус</label>
                <select
                  value={editData.status}
                  onChange={e => setEditData({ ...editData, status: e.target.value as Project['status'] })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
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
                  onClick={() => setShowEditForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">Клиент</div>
              <div className="font-medium text-gray-900">{project.client}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Адрес</div>
              <div className="font-medium text-gray-900 text-sm">{project.address || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Бюджет</div>
              <div className="font-medium text-gray-900">
                {project.budget ? `${(project.budget / 1000).toFixed(1)}к ₽` : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Срок</div>
              <div className="font-medium text-gray-900 text-sm">
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

        {/* Компактный блок статистики */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
            {/* Прогресс задач */}
            <div className="flex flex-col justify-center h-full">
              <div className="flex items-center justify-between gap-2 mb-0">
                <span className="text-xs font-semibold text-gray-900">Прогресс задач</span>
                <span className="text-xs text-gray-600">{completedTasks} из {totalTasks} ({progressPercent}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div className="bg-green-600 h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            {/* Бюджет */}
            <div className="flex flex-col justify-center h-full">
              <div className="flex items-center justify-between gap-2 mb-0">
                <span className="text-xs font-semibold text-gray-900">Бюджет проекта</span>
                <span className="text-xs text-gray-600">&nbsp;</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div className={`h-1.5 rounded-full transition-all ${budgetUsed > 90 ? 'bg-red-600' : budgetUsed > 70 ? 'bg-yellow-600' : 'bg-blue-600'}`} style={{ width: `${Math.min(budgetUsed, 100)}%` }}></div>
              </div>
              <div className="flex items-center justify-end mt-1">
                <span className="text-xs text-gray-600 font-semibold">{totalInvoices.toLocaleString('ru-RU')} ₽</span>
                <button 
                  onClick={() => setShowBudgetDetails(!showBudgetDetails)}
                  className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center ml-2"
                  title={showBudgetDetails ? 'Скрыть детали' : 'Показать детали'}
                >
                  {showBudgetDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Детали бюджета (сворачиваемые) */}
          {showBudgetDetails && sortedCategories.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Бюджет по категориям:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedCategories.map(([category, amount]) => {
                  const percent = totalInvoices > 0 ? Math.round((amount / totalInvoices) * 100) : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 font-medium">{categoryLabels[category as SupplierCategory] || category}</span>
                        <span className="text-gray-600">{amount.toLocaleString('ru-RU')} ₽ ({percent}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-900">Итого использовано:</span>
                <span className={`font-semibold ${budgetUsed > 90 ? 'text-red-600' : budgetUsed > 70 ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {budgetUsed}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Контент вкладки: Задачи */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Задачи ({tasks.length})</h2>
                <button onClick={() => setShowTaskForm(!showTaskForm)} className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded min-h-[44px]">
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

            {/* Форма создания задачи */}
            {showTaskForm && (
              <div className="p-4 border-b bg-gray-50">
                <form onSubmit={createTask} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Название задачи *</label>
                    <input
                      type="text"
                      required
                      value={taskData.title}
                      onChange={e => setTaskData({ ...taskData, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                      placeholder="Название задачи"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Описание</label>
                    <textarea
                      value={taskData.description}
                      onChange={e => setTaskData({ ...taskData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                      placeholder="Описание задачи"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Приоритет</label>
                      <select
                        value={taskData.priority}
                        onChange={e => setTaskData({ ...taskData, priority: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                      >
                        <option value="3">Низкий</option>
                        <option value="2">Средний</option>
                        <option value="1">Высокий</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Срок</label>
                      <input
                        type="date"
                        value={taskData.due_date}
                        onChange={e => setTaskData({ ...taskData, due_date: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowTaskForm(false)}
                      className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg text-sm min-h-[44px]"
                      disabled={isCreatingTask}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                      disabled={isCreatingTask}
                    >
                      {isCreatingTask ? 'Создание...' : 'Создать'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="divide-y" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
              {tasks.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">Задач пока нет</div>
              ) : (
                (() => {
                  // Сортировка: невыполненные (новые сверху) -> выполненные (старые снизу)
                  const sortedTasks = [...tasks].sort((a, b) => {
                    // Сначала группируем по статусу
                    if (a.status !== b.status) {
                      return a.status === 'todo' ? -1 : 1;
                    }
                    // Внутри группы: невыполненные - от новых к старым, выполненные - от старых к новым
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    return a.status === 'todo' ? dateB - dateA : dateA - dateB;
                  });

                  return sortedTasks.map(task => (
                  <div key={task.id} className="p-3 hover:bg-gray-50 flex items-start gap-3">
                    <button onClick={() => toggleTaskStatus(task.id, task.status)} className="mt-0.5 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
                      {task.status === 'done' ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <Circle className="w-6 h-6" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.title}
                      </div>
                      {task.description && <div className="text-xs text-gray-600 mt-1">{task.description}</div>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${priorityLabels[task.priority as keyof typeof priorityLabels]?.color || 'text-gray-600'}`}>
                          {task.priority === 1 ? '🔴' : task.priority === 2 ? '🟡' : '🟢'}
                          {' '}{priorityLabels[task.priority as keyof typeof priorityLabels]?.label || 'Неизвестно'}
                        </span>
                        {task.due_date && <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString('ru-RU')}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-600 mt-0.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  ));
                })()
              )}
            </div>
          </div>

          {/* Блокнот для заметок */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">📝 Заметки</h2>
              {isSavingNotes && (
                <span className="text-xs text-gray-500">Сохранение...</span>
              )}
              {!isSavingNotes && notesLastSaved && (
                <span className="text-xs text-gray-500">
                  Сохранено {notesLastSaved.toLocaleTimeString('ru-RU')}
                </span>
              )}
            </div>
            <div className="p-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Введите заметки по проекту..."
                className="w-full h-[calc(100vh-500px)] min-h-[300px] px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-[16px]"
                style={{ lineHeight: '1.5' }}
              />
              <div className="mt-2 text-xs text-gray-500">
                💡 Заметки автоматически сохраняются через 2 секунды после последнего изменения
              </div>
            </div>
          </div>

          </div>
        )}

        {/* Контент вкладки: Финансы */}
        {activeTab === 'finance' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900">Счета ({invoices.length})</h2>
                {selectedInvoices.size > 0 && (
                  <button
                    onClick={unlinkSelectedInvoices}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200 min-h-[44px]"
                  >
                    <X className="w-3 h-3" />
                    Отвязать ({selectedInvoices.size})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {uploadProgress && (
                  <span className="text-xs text-gray-600 mr-2">{uploadProgress}</span>
                )}
                <label className="flex items-center gap-1 px-2 py-1 text-sm text-green-600 hover:bg-green-50 rounded cursor-pointer min-h-[44px]">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Загрузка...' : 'Загрузить'}
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.txt,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,text/plain"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <button onClick={loadAvailableInvoices} className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded min-h-[44px]">
                  <Plus className="w-4 h-4" />
                  Привязать
                </button>
              </div>
            </div>

            {/* Окно выбора счетов */}
            {showInvoiceSelect && (
              <div className="p-4 border-b bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Выберите счет для привязки</h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {availableInvoices.length === 0 ? (
                    <p className="text-sm text-gray-500">Нет доступных счетов без проекта</p>
                  ) : (
                    availableInvoices.map(invoice => (
                      <button
                        key={invoice.id}
                        onClick={() => linkInvoiceToProject(invoice.id)}
                        className="w-full p-2 text-left border rounded hover:bg-white hover:border-blue-500 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                            <div className="text-xs text-gray-600">{invoice.suppliers?.name || '—'}</div>
                            <div className="text-xs text-gray-500">{new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}</div>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.total_amount ? `${(invoice.total_amount / 1000).toFixed(1)}к ₽` : '—'}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <button
                  onClick={() => setShowInvoiceSelect(false)}
                  className="mt-3 w-full px-3 py-1.5 text-gray-700 bg-white border rounded-lg hover:bg-gray-50 text-sm"
                >
                  Закрыть
                </button>
              </div>
            )}

            {/* Drag and Drop зона */}
            {invoices.length === 0 && !uploading && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`m-4 p-8 border-2 border-dashed rounded-lg text-center transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                }`}
              >
                <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {isDragging ? 'Отпустите файлы для загрузки' : 'Перетащите файлы счетов сюда'}
                </p>
                <p className="text-xs text-gray-500">
                  PDF, Excel, Word, изображения, текстовые файлы
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  или используйте кнопку "Загрузить" выше
                </p>
              </div>
            )}

            {/* Фильтры по категориям */}
            {invoices.length > 0 && (
              <div className="p-3 border-b bg-gray-50">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-gray-600">Фильтр:</span>
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={`px-2 py-1 text-xs rounded-full border ${
                      !categoryFilter 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    Все ({invoices.length})
                  </button>
                  {categoriesWithCounts.map(([cat, count]) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2 py-1 text-xs rounded-full border ${
                        categoryFilter === cat
                          ? categoryColors[cat] + ' font-medium'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {categoryLabels[cat as SupplierCategory] || cat} ({count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div 
              className={`divide-y relative ${isDragging ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/50' : ''}`}
              style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm pointer-events-none">
                  <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-500 border-dashed">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium text-gray-900">Отпустите файлы для загрузки</p>
                    <p className="text-xs text-gray-600 mt-1">Счета будут автоматически распознаны</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, Excel, Word, изображения, текст</p>
                  </div>
                </div>
              )}
              {invoices.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">Счетов пока нет</div>
              ) : (
                <>
                  {/* Десктопная таблица - скрыта на мобильных */}
                  <div className="hidden md:block">
                  {/* Заголовки таблицы */}
                  <div className="sticky top-0 bg-gray-50 border-b px-3 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-gray-600">
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                        onChange={toggleAllInvoices}
                        className="min-w-[20px] min-h-[20px] text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">Счет</div>
                    <div className="col-span-2">Поставщик</div>
                    <div className="col-span-2">Категория</div>
                    <div className="col-span-1">Дата</div>
                    <div className="col-span-2 text-right">Сумма</div>
                    <div className="col-span-1 text-right">НДС</div>
                    <div className="col-span-1 text-right"></div>
                  </div>
                  
                  {/* Строки счетов */}
                  {filteredInvoices.map(invoice => (
                    <div 
                      key={invoice.id} 
                      className={`px-3 py-2.5 grid grid-cols-12 gap-2 items-center text-sm transition-colors ${
                        selectedInvoices.has(invoice.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => toggleInvoiceSelection(invoice.id)}
                          className="min-w-[20px] min-h-[20px] text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="col-span-2 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{invoice.invoice_number}</div>
                          {invoice.file_url && (
                            <a 
                              href={invoice.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              📎 Открыть
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <div className="text-gray-900 text-xs font-medium truncate">
                          {invoice.suppliers?.name || '—'}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                          invoice.suppliers?.category ? categoryColors[invoice.suppliers.category] : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          {categoryLabels[(invoice.suppliers?.category || 'other') as SupplierCategory] || 'Без категории'}
                        </span>
                      </div>
                      
                      <div className="col-span-1 text-xs text-gray-600">
                        {new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}
                      </div>
                      
                      <div className="col-span-2 text-right font-medium text-gray-900">
                        {invoice.total_amount ? `${invoice.total_amount.toLocaleString('ru-RU')} ₽` : '—'}
                      </div>
                      
                      <div className="col-span-1 text-right text-xs text-gray-600">
                        {invoice.vat_amount ? `${invoice.vat_amount.toLocaleString('ru-RU')} ₽` : '—'}
                      </div>
                      
                      <div className="col-span-1 text-right">
                        <button 
                          onClick={() => unlinkInvoice(invoice.id)} 
                          className="text-gray-400 hover:text-red-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Отвязать счет"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>

                  {/* Мобильные карточки - показаны только на мобильных */}
                  <div className="md:hidden divide-y">
                    {filteredInvoices.map(invoice => (
                      <div 
                        key={invoice.id} 
                        className={`p-4 transition-colors ${
                          selectedInvoices.has(invoice.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.has(invoice.id)}
                            onChange={() => toggleInvoiceSelection(invoice.id)}
                            className="min-w-[32px] min-h-[32px] text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-2">
                              <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 text-base mb-1">{invoice.invoice_number}</div>
                                <div className="text-sm text-gray-700 font-medium mb-1">
                                  {invoice.suppliers?.name || '—'}
                                </div>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${
                                  invoice.suppliers?.category ? categoryColors[invoice.suppliers.category] : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}>
                                  {categoryLabels[(invoice.suppliers?.category || 'other') as SupplierCategory] || 'Без категории'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">Дата</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">Сумма</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {invoice.total_amount ? `${invoice.total_amount.toLocaleString('ru-RU')} ₽` : '—'}
                                </div>
                              </div>
                            </div>
                            
                            {invoice.vat_amount && (
                              <div className="mt-2 text-xs text-gray-600">
                                НДС: {invoice.vat_amount.toLocaleString('ru-RU')} ₽
                              </div>
                            )}
                            
                            <div className="flex gap-2 mt-3">
                              {invoice.file_url && (
                                <a 
                                  href={invoice.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex-1 text-center px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg min-h-[44px] flex items-center justify-center gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  📎 Открыть файл
                                </a>
                              )}
                              <button 
                                onClick={() => unlinkInvoice(invoice.id)} 
                                className="px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg min-h-[44px] flex items-center justify-center gap-1"
                                title="Отвязать счет"
                              >
                                <X className="w-4 h-4" />
                                Отвязать
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
