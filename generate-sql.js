const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Ошибка: не найдены переменные окружения SUPABASE');
  console.error('Нужны: NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('📝 Создание таблиц projects и tasks в Supabase...\n');
console.log('⚠️  ВНИМАНИЕ: Выполните следующий SQL код в Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new\n');

const sqlScript = `
-- ============================================
-- СОЗДАНИЕ ТАБЛИЦ ДЛЯ ПРОЕКТОВ И ЗАДАЧ
-- ============================================

-- 1. Создаем таблицу проектов
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'done', 'cancelled')),
    description TEXT,
    due_date DATE,
    budget NUMERIC(12, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 2. Создаем таблицу задач
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done')),
    priority INTEGER NOT NULL DEFAULT 2 CHECK (priority IN (1, 2, 3)),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assignee_id UUID,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 3. Добавляем связь project_id к таблице invoices
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Создаем индексы
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);

-- 5. Настройка RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 6. Политики доступа (разрешаем все операции)
DROP POLICY IF EXISTS "Allow all operations on projects" ON public.projects;
CREATE POLICY "Allow all operations on projects" ON public.projects
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;
CREATE POLICY "Allow all operations on tasks" ON public.tasks
    FOR ALL USING (true) WITH CHECK (true);

-- 7. Триггеры для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Создаем тестовый проект
INSERT INTO public.projects (title, client, address, status, description, budget, due_date)
VALUES (
    'ЖК Солнечный',
    'ООО "СтройКомплекс"',
    'г. Москва, ул. Примерная, д. 1',
    'active',
    'Остекление 5-этажного дома
Контакт: Иванов И.И.
Тел: +7 (999) 123-45-67',
    5000000,
    '2025-12-31'
)
ON CONFLICT DO NOTHING
RETURNING id;

-- 9. Создаем тестовые задачи (замените PROJECT_ID на id из предыдущего запроса)
-- INSERT INTO public.tasks (title, description, status, priority, project_id, due_date)
-- VALUES 
--     ('Замеры объекта', 'Провести замеры всех окон', 'done', 1, 'PROJECT_ID', '2025-11-15'),
--     ('Согласование договора', 'Подписать договор с заказчиком', 'in_progress', 1, 'PROJECT_ID', '2025-11-20'),
--     ('Закупка профилей', 'Заказать профили у поставщика', 'todo', 2, 'PROJECT_ID', '2025-11-25'),
--     ('Изготовление конструкций', 'Производство оконных конструкций', 'todo', 2, 'PROJECT_ID', '2025-12-10'),
--     ('Монтаж', 'Установка окон на объекте', 'todo', 1, 'PROJECT_ID', '2025-12-20');
`;

console.log('━'.repeat(80));
console.log(sqlScript);
console.log('━'.repeat(80));

// Сохраняем SQL в файл
fs.writeFileSync('setup-projects-tables.sql', sqlScript, 'utf8');
console.log('\n✅ SQL скрипт сохранен в файл: setup-projects-tables.sql');
console.log('\n📋 Инструкция:');
console.log('1. Откройте Supabase Dashboard: https://supabase.com/dashboard');
console.log('2. Выберите ваш проект');
console.log('3. Перейдите в SQL Editor (левое меню)');
console.log('4. Нажмите "New query"');
console.log('5. Скопируйте содержимое файла setup-projects-tables.sql');
console.log('6. Вставьте в редактор и нажмите "Run"');
console.log('7. После успешного выполнения запустите: node setup-projects.js');
console.log('\nИли можно использовать готовую схему из backup/cloud-schema-complete.sql\n');
