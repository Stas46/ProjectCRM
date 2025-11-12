# 🚀 Инструкция по деплою системы файлов

## ✅ Что уже сделано

1. ✅ Код задеплоен на GitHub
2. ✅ GitHub Actions автоматически задеплоит на сервер
3. ✅ Компоненты и API готовы к работе

## 📋 Что нужно сделать вручную

### Шаг 1: Применить миграцию БД

1. Открыть [Supabase Dashboard](https://supabase.com/dashboard/project/fpnugtlchxigwpqwiczc)
2. Перейти в **SQL Editor**
3. Скопировать содержимое файла `setup-project-files.sql`
4. Вставить в редактор и нажать **Run**

Или выполнить команду:

```sql
-- Создаем таблицу project_files
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  folder TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_folder ON project_files(folder);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON project_files(created_at DESC);

-- RLS политики
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project files"
ON project_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upload project files"
ON project_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project files"
ON project_files FOR DELETE TO authenticated USING (true);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_files_updated_at
BEFORE UPDATE ON project_files
FOR EACH ROW
EXECUTE FUNCTION update_project_files_updated_at();
```

### Шаг 2: Проверить Storage bucket

Bucket `invoice-files` уже создан и настроен. Политики позволяют:
- ✅ Чтение для всех (публичный доступ)
- ✅ Загрузка для аутентифицированных пользователей
- ✅ Удаление для аутентифицированных пользователей

Файлы проектов будут храниться в `invoice-files/projects/{project-id}/`

### Шаг 3: Интегрировать в интерфейс (опционально)

Если хотите добавить файловый менеджер на страницу проекта:

См. файл `docs/project-files-integration.md` для подробных инструкций.

Простой вариант - добавить в конец страницы проекта:

```tsx
// В src/app/projects/[id]/page.tsx
import { ProjectFileManager } from '@/components/ProjectFileManager';

// В JSX после раздела со счетами:
<div className="bg-white rounded-xl shadow-md p-6 mb-6">
  <ProjectFileManager projectId={projectId} />
</div>
```

### Шаг 4: Перезапустить приложение (автоматически)

GitHub Actions уже деплоит изменения. Подождать ~1 минуту.

Или вручную:

```bash
ssh root@82.97.253.12 "pm2 restart crm-glazing"
```

## 🎯 Проверка работы

### 1. Проверить таблицу в БД

```sql
SELECT * FROM project_files LIMIT 1;
```

Должна вернуться пустая таблица (или ошибка "no rows" - это нормально).

### 2. Проверить API

Открыть в браузере (замените `PROJECT_ID`):

```
https://your-domain.com/api/projects/PROJECT_ID/files
```

Должен вернуться JSON:

```json
{
  "success": true,
  "files": [],
  "folders": []
}
```

### 3. Проверить UI

1. Открыть любой проект
2. Увидеть раздел "📁 Файлы проекта"
3. Попробовать загрузить файл
4. Попробовать создать папку

## 📦 Структура файлов в Storage

После загрузки файлов структура будет:

```
invoice-files/
├── invoices/
│   └── 5146_2025-11-06_xxx.pdf
└── projects/
    └── 9cbb720f-a42c-4bac-b433-b74b0c3844dc/
        ├── photos/
        │   └── 1699876543210_photo.jpg
        ├── documents/
        │   └── 1699876543211_contract.pdf
        └── other/
            └── 1699876543212_file.zip
```

## 🐛 Решение проблем

### Ошибка "table does not exist"

Миграция не применена. Выполнить Шаг 1.

### Ошибка "permission denied"

RLS политики не созданы. Выполнить часть Шага 1 с политиками.

### Файлы не загружаются

1. Проверить логи: `ssh root@82.97.253.12 "pm2 logs crm-glazing --lines 50"`
2. Проверить Storage bucket в Supabase Dashboard
3. Проверить переменные окружения `SUPABASE_SERVICE_ROLE_KEY`

### Компонент не отображается

Проверить импорт в странице проекта:

```tsx
import { ProjectFileManager } from '@/components/ProjectFileManager';
```

## ✨ Готово!

Теперь у вас есть полноценная система управления файлами проектов! 🎉

**Возможности:**
- ✅ Загрузка любых файлов
- ✅ Организация в папки
- ✅ Скачивание файлов
- ✅ Удаление файлов
- ✅ Красивый UI
- ✅ Адаптивный дизайн

**Что дальше:**
- Добавить предпросмотр изображений
- Реализовать drag & drop
- Добавить множественную загрузку
- Добавить поиск по файлам
