## 🎯 ПРИМЕНИТЬ SQL МИГРАЦИЮ

### Быстрая инструкция (2 минуты):

1. **Открыть Supabase SQL Editor**
   👉 https://supabase.com/dashboard/project/fpnugtlchxigwpqwiczc/sql/new

2. **Скопировать и выполнить этот SQL:**

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

3. **Нажать "Run"** (или Ctrl+Enter)

4. **Готово!** ✅

---

## После применения миграции:

Через 1-2 минуты после деплоя откройте любой проект и увидите новый раздел **"📁 Файлы проекта"** внизу страницы!

**Возможности:**
- ✅ Загрузка файлов
- ✅ Создание папок
- ✅ Скачивание
- ✅ Удаление
- ✅ Навигация

**Поддерживаемые файлы:**
- PDF, Word, Excel
- Изображения (JPG, PNG, GIF, WebP)
- Архивы (ZIP, RAR, 7z)
- Любые другие типы
