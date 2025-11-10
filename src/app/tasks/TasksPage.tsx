"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Task } from '@/types/task';

// Утилита для логирования в файл
const logToFile = (() => {
  const logs: string[] = [];
  let timer: NodeJS.Timeout | null = null;

  const flush = async () => {
    if (logs.length === 0) return;
    
    const content = logs.join('\n') + '\n';
    logs.length = 0;

    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    } catch (err) {
      console.error('Failed to write log:', err);
    }
  };

  return (message: string) => {
    const timestamp = new Date().toISOString();
    logs.push(`[${timestamp}] ${message}`);
    
    // Сбрасываем в файл каждые 2 секунды
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 2000);
  };
})();

interface Project {
  id: string;
  name: string;
  emoji?: string;
}

// Компонент фильтров (как FilterRail из оригинала)
function FilterRail({ 
  viewMode, 
  setViewMode, 
  filterImportant, 
  setFilterImportant, 
  filterUrgent, 
  setFilterUrgent 
}: {
  viewMode: 'list' | 'matrix';
  setViewMode: (mode: 'list' | 'matrix') => void;
  filterImportant: boolean;
  setFilterImportant: (val: boolean) => void;
  filterUrgent: boolean;
  setFilterUrgent: (val: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center px-4 pt-4">
      <button
        className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        onClick={() => setViewMode('list')}
      >
        Список
      </button>
      <button
        className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${viewMode === 'matrix' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        onClick={() => setViewMode('matrix')}
      >
        Матрица
      </button>
      <button
        className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${filterImportant ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        onClick={() => setFilterImportant(!filterImportant)}
      >
        ⭐ Важно
      </button>
      <button
        className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${filterUrgent ? 'bg-blue-200 text-blue-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        onClick={() => setFilterUrgent(!filterUrgent)}
      >
        ⚡ Срочно
      </button>
    </div>
  );
}

// Компонент задачи (с поддержкой drag-and-drop)
function TaskItem({ 
  task, 
  compact = false,
  showProjectBadge = false,
  projectBadge,
  onToggleDone,
  onDelete,
  onEditTitle,
  onOpenContextMenu,
  onDragStart,
  onView
}: {
  task: Task;
  compact?: boolean;
  showProjectBadge?: boolean;
  projectBadge?: { name: string; emoji?: string } | null;
  onToggleDone: (task: Task) => void;
  onDelete: (id: string) => void;
  onEditTitle: (id: string, title: string) => void;
  onOpenContextMenu: (e: React.MouseEvent, task: Task) => void;
  onDragStart?: (task: Task) => void;
  onView?: (task: Task) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const commitEdit = () => {
    const t = title.trim();
    if (t && t !== task.title) onEditTitle(task.id, t);
    setEditing(false);
  };

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        if (onDragStart && !editing) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', task.id);
          onDragStart(task);
        }
      }}
      className={`bg-white shadow-sm rounded-xl transition-all hover:shadow-md ${compact ? 'p-2 mx-1.5 my-1' : 'p-3 mx-3 my-1.5'} cursor-move active:opacity-50`}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenContextMenu(e, task);
      }}
    >
      <div className="flex items-start gap-2">
        {/* Чекбокс */}
        <button
          onClick={(e) => {
            logToFile(`🖱️ Checkbox clicked for task: ${task.id} ${task.title}`);
            e.stopPropagation();
            e.preventDefault();
            logToFile(`Calling onToggleDone with task object`);
            onToggleDone(task);
          }}
          draggable={false}
          className={`flex-shrink-0 ${compact ? 'w-4 h-4' : 'w-5 h-5'} border-2 rounded flex items-center justify-center transition-colors cursor-pointer ${task.status === 'done' ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          {task.status === 'done' && <span className="text-xs text-green-600">✓</span>}
        </button>

        {/* Контент */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') { setEditing(false); setTitle(task.title); }
              }}
              className={`w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400 ${compact ? 'text-sm' : 'text-base'}`}
              autoFocus
            />
          ) : (
            <div 
              onClick={() => {
                if (compact && onView) {
                  onView(task);
                } else {
                  setEditing(true);
                }
              }} 
              className="cursor-pointer"
            >
              <p className={`${compact ? 'text-sm line-clamp-1' : 'text-base line-clamp-2'} ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {task.title}
              </p>
              {/* Description */}
              {!compact && task.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          )}

          {/* Бейджи */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {compact ? (
              <>
                {showProjectBadge && projectBadge && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full">
                    {projectBadge.emoji ?? '📁'}
                  </span>
                )}
                {task.priority === 1 && (
                  <span className="text-xs bg-amber-100 px-1.5 py-0.5 rounded-full">⭐</span>
                )}
                {task.status === 'in_progress' && (
                  <span className="text-xs bg-blue-100 px-1.5 py-0.5 rounded-full">⚡</span>
                )}
                {task.due_date && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                    📅 {new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </>
            ) : (
              <>
                {task.priority === 1 && (
                  <span className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded-full font-semibold">⭐ Важно</span>
                )}
                {task.status === 'in_progress' && (
                  <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded-full font-semibold">⚡ Срочно</span>
                )}
                {task.due_date && (
                  <span className="text-xs bg-purple-100 text-purple-900 px-2 py-1 rounded-full font-semibold">
                    📅 {new Date(task.due_date).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Project badge в списке */}
          {!compact && showProjectBadge && projectBadge && (
            <div className="mt-2">
              <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {projectBadge.emoji ?? '📁'} {projectBadge.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Ячейка квадранта матрицы (с поддержкой drag-and-drop)
function QuadrantCell({ 
  title, 
  tint, 
  bg, 
  data, 
  onAdd, 
  renderTask,
  quadrant,
  onDrop
}: {
  title: string;
  tint: string;
  bg: string;
  data: Task[];
  onAdd: () => void;
  renderTask: (task: Task) => React.ReactNode;
  quadrant: 'uv' | 'v' | 'u' | 'o';
  onDrop: (taskId: string, quadrant: 'uv' | 'v' | 'u' | 'o') => void;
}) {
  const [isDragOver, setIsDragOver] = React.useState(false);

  return (
    <div 
      className={`w-1/2 h-1/2 p-1.5 border-2 rounded-xl relative overflow-hidden transition-all ${isDragOver ? 'ring-4 ring-blue-400 border-blue-500' : ''}`}
      style={{ backgroundColor: bg, borderColor: isDragOver ? '#3B82F6' : tint }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
          onDrop(taskId, quadrant);
        }
      }}
    >
      <div className="px-2.5 py-1.5 rounded-lg mb-1.5 font-bold text-sm text-gray-800" style={{ backgroundColor: tint }}>
        {title} ({data.length})
      </div>

      <div className="overflow-y-auto h-[calc(100%-3.5rem)] pb-2">
        {data.map(task => (
          <div key={task.id}>{renderTask(task)}</div>
        ))}
      </div>

      <button
        onClick={onAdd}
        className="absolute right-2.5 bottom-2.5 w-7 h-7 bg-gray-900 text-white rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-700 transition-colors shadow-lg"
      >
        ＋
      </button>
    </div>
  );
}

// Контекстное меню (как в оригинале)
function ContextMenu({ 
  x, 
  y, 
  task, 
  onClose, 
  onToggleDone, 
  onEdit, 
  onDelete, 
  onMove 
}: {
  x: number;
  y: number;
  task: Task;
  onClose: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (quadrant: 'uv' | 'v' | 'u' | 'o') => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 min-w-[240px] max-w-[300px] overflow-hidden"
        style={{ top: y, left: x }}
      >
        <MenuItem onClick={onToggleDone}>{task.status === 'done' ? 'Снять отметку' : 'Отметить как готово'}</MenuItem>
        <MenuItem onClick={onEdit}>Редактировать</MenuItem>
        <div className="h-px bg-gray-200 my-1.5" />
        <div className="px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Перенести в…</div>
        <MenuItem onClick={() => onMove('uv')}>⭐⚡ Важно + Срочно</MenuItem>
        <MenuItem onClick={() => onMove('v')}>⭐ Важно</MenuItem>
        <MenuItem onClick={() => onMove('u')}>⚡ Срочно</MenuItem>
        <MenuItem onClick={() => onMove('o')}>• Остальное</MenuItem>
        <div className="h-px bg-gray-200 my-1.5" />
        <MenuItem onClick={onDelete} danger>Удалить</MenuItem>
      </div>
    </>
  );
}

function MenuItem({ onClick, children, danger = false }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-900'}`}
    >
      {children}
    </button>
  );
}

// Модалка просмотра задачи (для клика в матрице)
function ViewTaskModal({ 
  open, 
  task,
  projectName,
  onClose, 
  onEdit
}: {
  open: boolean;
  task: Task | null;
  projectName?: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!open || !task) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 md:inset-0 bottom-0 md:flex md:items-center md:justify-center z-50">
        <div className="bg-white rounded-t-3xl md:rounded-2xl p-5 md:p-6 max-h-[92vh] md:max-h-[85vh] overflow-y-auto shadow-2xl w-full md:w-[520px] md:max-w-[90vw]">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg md:text-xl font-bold ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
            </h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">✕</button>
          </div>

          {task.description && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Описание</label>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {task.due_date && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Срок выполнения</label>
              <p className="text-sm text-gray-700">
                📅 {new Date(task.due_date).toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          )}

          {projectName && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Проект</label>
              <p className="text-sm text-gray-700">📁 {projectName}</p>
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            {task.priority === 1 && (
              <span className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded-full font-semibold">⭐ Важно</span>
            )}
            {task.status === 'in_progress' && (
              <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded-full font-semibold">⚡ Срочно</span>
            )}
            {task.status === 'done' && (
              <span className="text-xs bg-green-100 text-green-900 px-2 py-1 rounded-full font-semibold">✓ Выполнено</span>
            )}
          </div>

          <div className="flex gap-2.5">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200 transition-colors text-sm">Закрыть</button>
            <button onClick={onEdit} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md text-sm">Редактировать</button>
          </div>
        </div>
      </div>
    </>
  );
}

// Модалка редактирования задачи
function EditTaskModal({ 
  open, 
  task,
  onClose, 
  onUpdate, 
  projects
}: {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onUpdate: (id: string, data: { title: string; description: string; due_date: string | null; project_id: string | null }) => void;
  projects: Project[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.due_date || '');
      setProjectId(task.project_id || 'inbox');
    }
  }, [open, task]);

  const submit = () => {
    if (!task) return;
    const t = title.trim();
    if (!t) return;
    onUpdate(task.id, { 
      title: t, 
      description: description.trim(), 
      due_date: dueDate || null,
      project_id: projectId === 'inbox' ? null : projectId
    });
    onClose();
  };

  if (!open || !task) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 md:inset-0 bottom-0 md:flex md:items-center md:justify-center z-50">
        <div className="bg-white rounded-t-3xl md:rounded-2xl p-5 md:p-6 max-h-[92vh] md:max-h-[85vh] overflow-y-auto shadow-2xl w-full md:w-[520px] md:max-w-[90vw]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Редактировать задачу</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">✕</button>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Дата выполнения</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Проект</label>
            <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto">
              {projects.filter(p => p.id !== 'all').map(p => (
                <button
                  key={p.id}
                  onClick={() => setProjectId(p.id)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    projectId === p.id 
                      ? 'bg-gray-900 text-white shadow-md' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span className="text-sm">{p.emoji ?? '📁'}</span>
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200 transition-colors text-sm">Отмена</button>
            <button onClick={submit} disabled={!title.trim()} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm">Сохранить</button>
          </div>
        </div>
      </div>
    </>
  );
}

// Модалка добавления задачи (улучшенная версия)
function AddTaskModal({ 
  open, 
  onClose, 
  onCreate, 
  projects, 
  defaultQuadrant, 
  defaultProject 
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; description: string; quadrant: string; project_id: string }) => void;
  projects: Project[];
  defaultQuadrant: string;
  defaultProject: string;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quadrant, setQuadrant] = useState(defaultQuadrant);
  const [projectId, setProjectId] = useState(defaultProject);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setQuadrant(defaultQuadrant);
      setProjectId(defaultProject === 'all' ? 'inbox' : defaultProject);
    }
  }, [open, defaultQuadrant, defaultProject]);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onCreate({ title: t, description: description.trim(), quadrant, project_id: projectId });
    onClose();
  };

  if (!open) return null;

  const quadrantOptions = [
    { key: 'uv', label: 'Важно + Срочно', icon: '⭐⚡', color: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
    { key: 'v', label: 'Важно', icon: '⭐', color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600' },
    { key: 'u', label: 'Срочно', icon: '⚡', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
    { key: 'o', label: 'Остальное', icon: '•', color: 'bg-gray-400', hoverColor: 'hover:bg-gray-500' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40 backdrop-blur-sm" onClick={onClose} />
      {/* Адаптивное позиционирование: снизу на мобильном, по центру на десктопе */}
      <div className="fixed inset-x-0 md:inset-0 bottom-0 md:flex md:items-center md:justify-center z-50">
        <div className="bg-white rounded-t-3xl md:rounded-2xl p-5 md:p-6 max-h-[92vh] md:max-h-[85vh] overflow-y-auto shadow-2xl w-full md:w-[520px] md:max-w-[90vw]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Создать задачу</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Title */}
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Название</label>
            <input
              type="text"
              placeholder="Введите название задачи..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Описание</label>
          <textarea
            placeholder="Добавьте детали..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
        </div>

        {/* Quadrant */}
        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Приоритет</label>
          <div className="grid grid-cols-2 gap-2">
            {quadrantOptions.map(q => (
              <button
                key={q.key}
                onClick={() => setQuadrant(q.key)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  quadrant === q.key 
                    ? `${q.color} text-white shadow-md` 
                    : `bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200`
                }`}
              >
                <span className="text-base">{q.icon}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Project */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Проект</label>
          <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto">
            {projects.filter(p => p.id !== 'all').map(p => (
              <button
                key={p.id}
                onClick={() => setProjectId(p.id)}
                className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  projectId === p.id 
                    ? 'bg-gray-900 text-white shadow-md scale-105' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
                }`}
              >
                <span className="text-base">{p.emoji ?? '📁'}</span>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-1">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200 transition-colors text-sm"
          >
            Отмена
          </button>
          <button 
            onClick={submit} 
            disabled={!title.trim()} 
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 shadow-md text-sm"
          >
            Создать
          </button>
        </div>
        </div>
      </div>
    </>
  );
}

// FAB кнопка (как в оригинале)
function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed right-6 bottom-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold hover:bg-gray-700 hover:scale-110 transition-all z-30"
    >
      ＋
    </button>
  );
}

// Snackbar для undo (как в оригинале)
function UndoSnackbar({ visible, title, onUndo }: { visible: boolean; title: string; onUndo: () => void }) {
  if (!visible) return null;
  return (
    <div className="fixed left-3 right-3 bottom-24 bg-gray-900 text-white px-3 py-2.5 rounded-xl flex items-center justify-between shadow-2xl z-40 animate-slide-up">
      <span className="text-sm flex-1 truncate">Удалено: {title || 'задача'}</span>
      <button onClick={onUndo} className="ml-4 text-yellow-300 font-bold text-sm hover:text-yellow-200 transition-colors">
        Восстановить
      </button>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('matrix');
  const [filterImportant, setFilterImportant] = useState(false);
  const [filterUrgent, setFilterUrgent] = useState(false);
  const [filterProject, setFilterProject] = useState<string>('all');

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: Task } | null>(null);
  const [addModal, setAddModal] = useState<{ open: boolean; quadrant: string; project: string } | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [viewModal, setViewModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [undo, setUndo] = useState<{ visible: boolean; title: string; deletedTask: Task | null }>({ visible: false, title: '', deletedTask: null });

  useEffect(() => {
    loadTasks();
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from('projects').select('id, title');
      if (error) throw error;
      setProjectsList((data || []).map((p: any) => ({ id: p.id, name: p.title, emoji: '📁' })));
    } catch (e: any) {
      logToFile(`❌ loadProjects error: ${e}`);
    }
  }

  async function loadTasks() {
    logToFile('📥 loadTasks - Starting task load...');
    setLoading(true);
    setError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) {
        logToFile(`❌ loadTasks - DB error: ${JSON.stringify(error)}`);
        throw error;
      }
      logToFile(`📦 loadTasks - Loaded from DB: ${data?.length || 0} tasks`);
      
      // Сортировка: выполненные задачи в конец
      const sorted = (data || []).sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return 0;
      });
      
      logToFile(`✅ loadTasks - Sorted tasks: ${sorted.map(t => `${t.title} (${t.status})`).join(', ')}`);
      setTasks(sorted);
    } catch (err: any) {
      logToFile(`❌ loadTasks error: ${err.message || err}`);
      setError(err.message || 'Ошибка загрузки задач');
    } finally {
      setLoading(false);
    }
  }

  async function toggleDone(task: Task) {
    const id = task.id;
    const newStatus: 'todo' | 'in_progress' | 'done' = task.status === 'done' ? 'todo' : 'done';
    
    logToFile(`🔄 toggleDone - Task: ${task.title} (${id}), Status: ${task.status} → ${newStatus}, Priority: ${task.priority}`);
    
    // Оптимистичное обновление UI
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error, data } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id).select();
      if (error) {
        logToFile(`❌ toggleDone DB error: ${JSON.stringify(error)}`);
        // Откатываем при ошибке
        setTasks(tasks.map(t => t.id === id ? { ...t, status: task.status } : t));
      } else {
        logToFile(`✅ toggleDone: DB updated successfully - ${task.title}`);
        // Перезагружаем задачи чтобы пересортировать
        loadTasks();
      }
    } catch (err) {
      logToFile(`❌ toggleDone error: ${err}`);
      // Откатываем при ошибке
      setTasks(tasks.map(t => t.id === id ? { ...t, status: task.status } : t));
    }
  }

  async function deleteTask(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) {
      logToFile(`❌ deleteTask: task not found - ${id}`);
      return;
    }
    
    logToFile(`🗑️ deleteTask - Deleting: ${task.title} (${id})`);
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      
      if (error) {
        logToFile(`❌ Delete error: ${JSON.stringify(error)}`);
        throw error;
      }
      
      logToFile(`✅ Task deleted from DB - ${task.title}`);
      setTasks(tasks.filter(t => t.id !== id));
      setUndo({ visible: true, title: task.title, deletedTask: task });
      setTimeout(() => setUndo({ visible: false, title: '', deletedTask: null }), 4000);
    } catch (err) {
      logToFile(`❌ deleteTask error: ${err}`);
    }
  }

  async function undoDelete() {
    if (!undo.deletedTask) {
      logToFile(`❌ undoDelete: no task to restore`);
      return;
    }
    
    logToFile(`↩️ undoDelete - Restoring task: ${undo.deletedTask.title}`);
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('tasks').insert([undo.deletedTask]);
      
      if (error) {
        logToFile(`❌ Restore error: ${JSON.stringify(error)}`);
        throw error;
      }
      
      logToFile(`✅ Task restored to DB - ${undo.deletedTask.title}`);
      setTasks([...tasks, undo.deletedTask]);
      setUndo({ visible: false, title: '', deletedTask: null });
    } catch (err) {
      logToFile(`❌ undoDelete error: ${err}`);
    }
  }

  async function editTitle(id: string, title: string) {
    logToFile(`✏️ editTitle - Task ID: ${id}, New title: ${title}`);
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('tasks').update({ title }).eq('id', id);
      
      if (error) {
        logToFile(`❌ editTitle - Update error: ${JSON.stringify(error)}`);
        throw error;
      }
      
      logToFile(`✅ editTitle - Title updated in DB for task ${id}`);
      setTasks(tasks.map(t => t.id === id ? { ...t, title } : t));
    } catch (err) {
      logToFile(`❌ editTitle error: ${err}`);
    }
  }

  async function updateTask(id: string, data: { title: string; description: string; due_date: string | null; project_id: string | null }) {
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('tasks').update(data).eq('id', id);
      const updated = tasks.map(t => {
        if (t.id === id) {
          return { ...t, ...data } as Task;
        }
        return t;
      });
      setTasks(updated);
    } catch (err) {
      logToFile(`❌ updateTask error: ${err}`);
    }
  }

  async function moveToQuadrant(id: string, quadrant: 'uv' | 'v' | 'u' | 'o') {
    const task = tasks.find(t => t.id === id);
    if (!task) {
      logToFile(`❌ moveToQuadrant: task not found - ${id}`);
      return;
    }
    
    const map: Record<string, { priority: 1 | 2 | 3; status: 'todo' | 'in_progress' | 'done' }> = {
      uv: { priority: 1, status: 'in_progress' },
      v: { priority: 1, status: 'todo' },
      u: { priority: 2, status: 'in_progress' },
      o: { priority: 2, status: 'todo' },
    };
    const baseUpdate = map[quadrant];
    if (!baseUpdate) {
      logToFile(`❌ moveToQuadrant: invalid quadrant - ${quadrant}`);
      return;
    }
    
    // Сохраняем статус 'done' если задача была выполнена
    const update = {
      priority: baseUpdate.priority,
      status: task.status === 'done' ? 'done' as const : baseUpdate.status
    };
    
    logToFile(`📦 moveToQuadrant - Task: ${task.title} (ID: ${id})`);
    logToFile(`Target quadrant: ${quadrant}`);
    logToFile(`Current state: status=${task.status}, priority=${task.priority}`);
    logToFile(`Base update from map: ${JSON.stringify(baseUpdate)}`);
    logToFile(`Final update (done preserved): ${JSON.stringify(update)}`);
    
    // Оптимистичное обновление UI
    setTasks(tasks.map(t => t.id === id ? { ...t, priority: update.priority, status: update.status } : t));
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error, data } = await supabase.from('tasks').update(update).eq('id', id).select();
      if (error) {
        logToFile(`❌ moveToQuadrant DB error: ${JSON.stringify(error)}`);
        // Откатываем при ошибке
        setTasks(tasks.map(t => t.id === id ? { ...t, priority: task.priority, status: task.status } : t));
      } else {
        logToFile(`✅ moveToQuadrant: DB updated successfully - ${JSON.stringify(data)}`);
      }
    } catch (err) {
      logToFile(`❌ moveToQuadrant error: ${err}`);
      // Откатываем при ошибке
      setTasks(tasks.map(t => t.id === id ? { ...t, priority: task.priority, status: task.status } : t));
    }
  }

  async function createTask(data: { title: string; description: string; quadrant: string; project_id: string }) {
    const map: Record<string, { priority: 1 | 2 | 3; status: 'todo' | 'in_progress' | 'done' }> = {
      uv: { priority: 1, status: 'in_progress' },
      v: { priority: 1, status: 'todo' },
      u: { priority: 2, status: 'in_progress' },
      o: { priority: 2, status: 'todo' },
    };
    const fields = map[data.quadrant] || { priority: 2, status: 'todo' as const };
    
    logToFile(`➕ createTask - Input: ${data.title}, Quadrant: ${data.quadrant}`);
    logToFile(`Fields from map: ${JSON.stringify(fields)}`);
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const projectId = data.project_id === 'inbox' ? null : data.project_id;
      
      const taskData = {
        title: data.title,
        description: data.description,
        project_id: projectId,
        priority: fields.priority,
        status: fields.status,
        created_at: new Date().toISOString(),
      };
      
      logToFile(`✅ Inserting task into DB: ${JSON.stringify(taskData)}`);
      
      const { data: inserted, error } = await supabase.from('tasks').insert(taskData).select();
      
      if (error) {
        logToFile(`❌ createTask insert error: ${JSON.stringify(error)}`);
        throw error;
      }
      
      logToFile(`✅ Task created successfully: ${JSON.stringify(inserted)}`);
      logToFile(`🔄 Calling loadTasks to refresh...`);
      loadTasks();
    } catch (err) {
      logToFile(`❌ createTask error: ${err}`);
      alert(`Ошибка создания задачи: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  }

  // Фильтрация (как в оригинале)
  const filteredTasks = useMemo(() => {
    const result = tasks.filter(task => {
      if (filterImportant && task.priority !== 1) return false;
      if (filterUrgent && task.status !== 'in_progress') return false;
      if (filterProject !== 'all') {
        // Для Inbox показываем задачи где project_id === null
        if (filterProject === 'inbox') {
          return task.project_id === null || task.project_id === undefined;
        }
        // Для других проектов - точное совпадение
        if (task.project_id !== filterProject) return false;
      }
      return true;
    });
    logToFile(`Filtered tasks: project=${filterProject}, total=${tasks.length}, filtered=${result.length}, nullProjectId=${tasks.filter(t => !t.project_id).length}`);
    return result;
  }, [tasks, filterImportant, filterUrgent, filterProject]);

  // Группировка по квадрантам (матрица Эйзенхауэра)
  const isImportant = (t: Task) => {
    // Выполненные задачи НЕ считаются важными
    if (t.status === 'done') {
      return false;
    }
    const result = t.priority === 1;
    if (result) logToFile(`⭐ Task is IMPORTANT: ${t.title}, priority: ${t.priority}`);
    return result;
  };
  
  const isUrgent = (t: Task) => {
    let result = false;
    let reason = '';
    
    // Выполненные задачи НЕ считаются срочными
    if (t.status === 'done') {
      return false;
    }
    
    if (t.status === 'in_progress') {
      result = true;
      reason = 'status is in_progress';
    } else if (t.due_date) {
      const diff = (new Date(t.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (diff <= 3) {
        result = true;
        reason = `due_date in ${diff.toFixed(1)} days`;
      }
    }
    
    if (result) {
      logToFile(`⚡ Task is URGENT: ${t.title}, reason: ${reason}, status: ${t.status}, due_date: ${t.due_date}`);
    }
    return result;
  };

  const groups = useMemo(() => {
    logToFile('📊 Grouping tasks into quadrants');
    // В режиме матрицы используем ВСЕ задачи, игнорируя фильтр проекта
    // В режиме списка используем отфильтрованные задачи
    const tasksForGrouping = viewMode === 'matrix' ? tasks : filteredTasks;
    const uv = tasksForGrouping.filter(t => isImportant(t) && isUrgent(t));
    const v = tasksForGrouping.filter(t => isImportant(t) && !isUrgent(t));
    const u = tasksForGrouping.filter(t => !isImportant(t) && isUrgent(t));
    const o = tasksForGrouping.filter(t => !isImportant(t) && !isUrgent(t));
    logToFile(`UV (Important + Urgent): ${uv.length} tasks - ${uv.map(t => t.title).join(', ')}`);
    logToFile(`V (Important): ${v.length} tasks - ${v.map(t => t.title).join(', ')}`);
    logToFile(`U (Urgent): ${u.length} tasks - ${u.map(t => t.title).join(', ')}`);
    logToFile(`O (Other): ${o.length} tasks - ${o.map(t => t.title).join(', ')}`);
    return { uv, v, u, o };
  }, [filteredTasks, tasks, viewMode]);

  // Проекты для меню (включая Inbox)
  const projects: Project[] = useMemo(() => {
    const uniqueIds = Array.from(new Set(tasks.map(t => t.project_id).filter(Boolean)));
    return [
      { id: 'all', name: 'Все', emoji: '📁' },
      { id: 'inbox', name: 'Inbox', emoji: '📥' },
      ...uniqueIds.map(pid => {
        const found = projectsList.find(p => p.id === pid);
        return found ? found : { id: pid!, name: `Проект ${String(pid).slice(0, 8)}`, emoji: '📁' };
      })
    ];
  }, [tasks, projectsList]);

  const showProjectBadge = filterProject === 'all';
  const getProjectBadge = useCallback((task: Task) => {
    if (!showProjectBadge) return null;
    if (!task.project_id) return { name: 'Inbox', emoji: '📥' };
    const p = projectsList.find(pr => pr.id === task.project_id);
    return p ? { name: p.name, emoji: p.emoji } : null;
  }, [projectsList, showProjectBadge]);

  const renderTask = useCallback((task: Task) => {
    return (
      <TaskItem
        key={task.id}
        task={task}
        compact={viewMode === 'matrix'}
        showProjectBadge={showProjectBadge}
        projectBadge={getProjectBadge(task)}
        onToggleDone={toggleDone}
        onDelete={deleteTask}
        onEditTitle={editTitle}
        onView={(t) => setViewModal({ open: true, task: t })}
        onDragStart={(t) => {
          // Drag started - можно добавить визуальную индикацию если нужно
          logToFile(`🖱️ Dragging task: ${t.title}`);
        }}
        onOpenContextMenu={(e, t) => {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          let x = e.clientX;
          let y = e.clientY;
          if (x + 260 > vw) x = Math.max(8, vw - 260);
          if (y + 400 > vh) y = Math.max(8, vh - 400);
          setContextMenu({ x, y, task: t });
        }}
      />
    );
  }, [viewMode, showProjectBadge, getProjectBadge]);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Меню проектов слева */}
      <aside className="w-48 border-r bg-gray-50 p-3 flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-lg text-gray-900">Проекты</div>
          <a 
            href="/" 
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
            title="На главную"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </a>
        </div>
        {projects.map(p => (
          <button
            key={p.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full font-semibold text-sm transition-colors ${filterProject === p.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-200 text-gray-700'}`}
            onClick={() => setFilterProject(p.id)}
          >
            <span className="text-lg flex-shrink-0">{p.emoji}</span>
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </aside>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FilterRail
          viewMode={viewMode}
          setViewMode={setViewMode}
          filterImportant={filterImportant}
          setFilterImportant={setFilterImportant}
          filterUrgent={filterUrgent}
          setFilterUrgent={setFilterUrgent}
        />

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Загрузка...</div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-500">{error}</div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Нет задач</div>
        ) : viewMode === 'matrix' ? (
          <div className="flex-1 flex flex-wrap p-1.5 overflow-hidden">
            <QuadrantCell 
              title="⭐⚡ Важно + Срочно" 
              tint="#FFC5CF" 
              bg="rgba(255,197,207,0.45)" 
              data={groups.uv} 
              quadrant="uv"
              onAdd={() => setAddModal({ open: true, quadrant: 'uv', project: filterProject })} 
              onDrop={moveToQuadrant}
              renderTask={renderTask} 
            />
            <QuadrantCell 
              title="⭐ Важно" 
              tint="#FFE8A3" 
              bg="rgba(255,232,163,0.45)" 
              data={groups.v} 
              quadrant="v"
              onAdd={() => setAddModal({ open: true, quadrant: 'v', project: filterProject })} 
              onDrop={moveToQuadrant}
              renderTask={renderTask} 
            />
            <QuadrantCell 
              title="⚡ Срочно" 
              tint="#D8EFFD" 
              bg="rgba(216,239,253,0.45)" 
              data={groups.u} 
              quadrant="u"
              onAdd={() => setAddModal({ open: true, quadrant: 'u', project: filterProject })} 
              onDrop={moveToQuadrant}
              renderTask={renderTask} 
            />
            <QuadrantCell 
              title="• Остальное" 
              tint="#D9F5E5" 
              bg="rgba(217,245,229,0.55)" 
              data={groups.o} 
              quadrant="o"
              onAdd={() => setAddModal({ open: true, quadrant: 'o', project: filterProject })} 
              onDrop={moveToQuadrant}
              renderTask={renderTask} 
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-2">
            {filteredTasks.map(task => renderTask(task))}
          </div>
        )}
      </div>

      {/* Контекстное меню */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          task={contextMenu.task}
          onClose={() => setContextMenu(null)}
          onToggleDone={() => { toggleDone(contextMenu.task); setContextMenu(null); }}
          onEdit={() => {
            setEditModal({ open: true, task: contextMenu.task });
            setContextMenu(null);
          }}
          onDelete={() => { deleteTask(contextMenu.task.id); setContextMenu(null); }}
          onMove={(q) => { moveToQuadrant(contextMenu.task.id, q); setContextMenu(null); }}
        />
      )}

      {/* Модалка просмотра */}
      {viewModal.open && (
        <ViewTaskModal
          open={viewModal.open}
          task={viewModal.task}
          projectName={viewModal.task ? getProjectBadge(viewModal.task)?.name : undefined}
          onClose={() => setViewModal({ open: false, task: null })}
          onEdit={() => {
            setEditModal({ open: true, task: viewModal.task });
            setViewModal({ open: false, task: null });
          }}
        />
      )}

      {/* Модалка редактирования */}
      {editModal.open && (
        <EditTaskModal
          open={editModal.open}
          task={editModal.task}
          onClose={() => setEditModal({ open: false, task: null })}
          onUpdate={updateTask}
          projects={projects}
        />
      )}

      {/* Модалка добавления */}
      {addModal?.open && (
        <AddTaskModal
          open={addModal.open}
          onClose={() => setAddModal(null)}
          onCreate={createTask}
          projects={projects}
          defaultQuadrant={addModal.quadrant}
          defaultProject={addModal.project}
        />
      )}

      {/* Undo snackbar */}
      <UndoSnackbar visible={undo.visible} title={undo.title} onUndo={undoDelete} />

      {/* FAB */}
      <Fab onClick={() => setAddModal({ open: true, quadrant: 'o', project: filterProject })} />
    </div>
  );
}
