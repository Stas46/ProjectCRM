-- Удаляем столбец status из таблицы invoices
ALTER TABLE public.invoices DROP COLUMN IF EXISTS status;

-- Создаем таблицу поставщиков
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    inn TEXT,
    category TEXT NOT NULL DEFAULT 'additional',
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу пользовательских категорий
CREATE TABLE IF NOT EXISTS public.custom_expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON public.suppliers(category);
CREATE INDEX IF NOT EXISTS idx_custom_categories_project ON public.custom_expense_categories(project_id);

-- Включаем RLS для новых таблиц
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_expense_categories ENABLE ROW LEVEL SECURITY;

-- Создаем политики доступа для suppliers
CREATE POLICY "Allow read access to suppliers" ON public.suppliers 
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to suppliers" ON public.suppliers 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to suppliers" ON public.suppliers 
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to suppliers" ON public.suppliers 
    FOR DELETE USING (true);

-- Создаем политики доступа для custom_expense_categories
CREATE POLICY "Allow read access to custom categories" ON public.custom_expense_categories 
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to custom categories" ON public.custom_expense_categories 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to custom categories" ON public.custom_expense_categories 
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to custom categories" ON public.custom_expense_categories 
    FOR DELETE USING (true);

-- Вставляем базовые данные поставщиков
INSERT INTO public.suppliers (name, category, description) VALUES
    ('Алюмакс', 'profile', 'Поставщик алюминиевых профилей'),
    ('ПВХ-Системы', 'profile', 'Поставщик ПВХ профилей для окон'),
    ('СтеклоТех', 'glass_units', 'Производство стеклопакетов'),
    ('МетизЦентр', 'hardware', 'Поставщик крепежных элементов'),
    ('Фурнитура+', 'fittings', 'Оконная и дверная фурнитура'),
    ('КронштейнСтрой', 'brackets', 'Специализированные кронштейны'),
    ('ДоставкаСтрой', 'delivery', 'Логистические услуги'),
    ('ПодъемТех', 'lifting_equipment', 'Аренда подъемного оборудования')
ON CONFLICT DO NOTHING;