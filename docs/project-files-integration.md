# Интеграция файлового менеджера в страницу проекта

## 📋 Что сделать

Добавить в страницу проекта (`src/app/projects/[id]/page.tsx`) новый раздел "Файлы" с компонентом `ProjectFileManager`.

## 🔧 Инструкция

### 1. Импортировать компонент

В начале файла `src/app/projects/[id]/page.tsx` добавить:

```tsx
import { ProjectFileManager } from '@/components/ProjectFileManager';
```

### 2. Добавить раздел "Файлы"

Найти место где отрисовываются счета (раздел с `filteredInvoices`) и после него добавить:

```tsx
{/* Раздел Файлы */}
{project && (
  <div className="bg-white rounded-xl shadow-md p-6 mb-6">
    <ProjectFileManager projectId={projectId} userId={undefined} />
  </div>
)}
```

### 3. Альтернативный вариант - вкладки

Если хотите сделать вкладки (Обзор / Задачи / Счета / Файлы), используйте следующий код:

```tsx
const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'invoices' | 'files'>('overview');

// В JSX:
<div className="mb-6">
  <div className="border-b border-gray-200">
    <nav className="-mb-px flex space-x-8">
      <button
        onClick={() => setActiveTab('overview')}
        className={`py-4 px-1 border-b-2 font-medium text-sm ${
          activeTab === 'overview'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Обзор
      </button>
      <button
        onClick={() => setActiveTab('tasks')}
        className={`py-4 px-1 border-b-2 font-medium text-sm ${
          activeTab === 'tasks'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Задачи ({tasks.filter(t => !t.archived).length})
      </button>
      <button
        onClick={() => setActiveTab('invoices')}
        className={`py-4 px-1 border-b-2 font-medium text-sm ${
          activeTab === 'invoices'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Счета ({filteredInvoices.length})
      </button>
      <button
        onClick={() => setActiveTab('files')}
        className={`py-4 px-1 border-b-2 font-medium text-sm ${
          activeTab === 'files'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        📁 Файлы
      </button>
    </nav>
  </div>

  {/* Контент вкладок */}
  {activeTab === 'overview' && (
    // ... существующий контент обзора
  )}
  
  {activeTab === 'tasks' && (
    // ... существующий контент задач
  )}
  
  {activeTab === 'invoices' && (
    // ... существующий контент счетов
  )}
  
  {activeTab === 'files' && (
    <div className="mt-6">
      <ProjectFileManager projectId={projectId} userId={undefined} />
    </div>
  )}
</div>
```

## 📦 Что уже готово

✅ Компонент `ProjectFileManager` создан
✅ API endpoint `/api/projects/[id]/files` готов
✅ Hook `useProjectFiles` реализован
✅ Таблица `project_files` готова к созданию в БД

## ⚙️ Что нужно сделать вручную

1. **Добавить импорт** компонента в `src/app/projects/[id]/page.tsx`
2. **Вставить компонент** в нужное место страницы
3. **Применить миграцию БД** - выполнить SQL скрипт из файла `setup-project-files.sql` в Supabase SQL Editor
4. **Задеплоить** изменения на сервер

## 🎨 Возможности файлового менеджера

- ✅ Загрузка файлов (все типы: PDF, Excel, Word, изображения, архивы)
- ✅ Создание папок (photos, documents, invoices, other и т.д.)
- ✅ Просмотр файлов с превью иконок
- ✅ Скачивание файлов
- ✅ Удаление файлов
- ✅ Навигация по папкам
- ✅ Отображение размера и даты загрузки
- ✅ Адаптивный дизайн (мобильная версия)
