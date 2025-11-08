-- =================================
-- ПОЛНАЯ СХЕМА ДЛЯ ОБЛАЧНОЙ SUPABASE
-- =================================

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =================================
-- УДАЛЯЕМ СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ (если нужно)
-- =================================

-- Осторожно! Это удалит все данные
-- DROP TABLE IF EXISTS public.task_attachments CASCADE;
-- DROP TABLE IF EXISTS public.task_comments CASCADE;
-- DROP TABLE IF EXISTS public.shift_assignees CASCADE;
-- DROP TABLE IF EXISTS public.shifts CASCADE;
-- DROP TABLE IF EXISTS public.crew_members CASCADE;
-- DROP TABLE IF EXISTS public.crews CASCADE;
-- DROP TABLE IF EXISTS public.employees CASCADE;
-- DROP TABLE IF EXISTS public.tasks CASCADE;
-- DROP TABLE IF EXISTS public.invoices CASCADE;
-- DROP TABLE IF EXISTS public.suppliers CASCADE;
-- DROP TABLE IF EXISTS public.projects CASCADE;

-- =================================
-- СОЗДАЕМ ВСЕ ТАБЛИЦЫ
-- =================================

-- Таблица для проектов (может уже существовать)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planning', 'active', 'on_hold', 'done', 'cancelled')),
    description TEXT,
    due_date DATE,
    budget NUMERIC(12, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Таблица для задач
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done')),
    priority INTEGER NOT NULL CHECK (priority IN (1, 2, 3)),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assignee_id UUID,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Таблица для сотрудников
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Таблица для бригад/экипажей
CREATE TABLE IF NOT EXISTS public.crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Таблица для членов бригад
CREATE TABLE IF NOT EXISTS public.crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    role TEXT,
    UNIQUE (crew_id, employee_id)
);

-- Таблица для смен в календаре
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    crew_id UUID REFERENCES public.crews(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Таблица для назначения сотрудников на смены
CREATE TABLE IF NOT EXISTS public.shift_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    UNIQUE (shift_id, employee_id)
);

-- Таблица для счетов
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    vendor TEXT NOT NULL,
    number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'to_pay', 'paid', 'rejected')),
    category TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_path TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Таблица для поставщиков/категоризации
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(20),
    category VARCHAR(100) DEFAULT 'Доп. затраты',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name)
);

-- Таблица для комментариев к задачам
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.employees(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Таблица для вложений к задачам
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =================================
-- ИНДЕКСЫ
-- =================================

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_inn ON public.suppliers(inn);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON public.suppliers(category);

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON public.invoices(vendor);
CREATE INDEX IF NOT EXISTS idx_invoices_uploaded_at ON public.invoices(uploaded_at);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- =================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- =================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON public.projects 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON public.suppliers 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON public.invoices 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON public.tasks 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =================================

-- Добавляем поставщиков с категориями
INSERT INTO public.suppliers (name, inn, category) VALUES 
('АлРус', '7807147519', 'Материалы'),
('Ал-Профи', '7839120887', 'Профили'),
('Эксперт Рентал Инжиниринг', '784802613697', 'Аренда оборудования'),
('ОкнаПро', '1234567890', 'Окна'),
('СтеклоМастер', '0987654321', 'Стекло'),
('ПрофильТорг', '5555555555', 'Профили'),
('ФурнитураПлюс', '6666666666', 'Фурнитура'),
('ГерметикСити', '7777777777', 'Герметики'),
('МонтажСервис', '8888888888', 'Монтаж'),
('ИнструментПро', '9999999999', 'Инструменты'),
('БезопасностьПлюс', '1111111111', 'Безопасность'),
('ТранспортСервис', '2222222222', 'Транспорт'),
('СпецТехника', '3333333333', 'Спецтехника'),
('КлинингПро', '4444444444', 'Уборка'),
('ОфисСнаб', '5555555554', 'Офисные расходы')
ON CONFLICT (name) DO NOTHING;

-- =================================
-- ПРАВА ДОСТУПА (RLS)
-- =================================

-- Включаем Row Level Security для безопасности
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

-- Создаем политики доступа (разрешаем все для сервисной роли)
CREATE POLICY "Allow service role access" ON public.projects FOR ALL USING (true);
CREATE POLICY "Allow service role access" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Allow service role access" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "Allow service role access" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Allow service role access" ON public.employees FOR ALL USING (true);
CREATE POLICY "Allow service role access" ON public.crews FOR ALL USING (true);

-- =================================
-- ЗАВЕРШЕНИЕ
-- =================================

-- Показываем созданные таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;