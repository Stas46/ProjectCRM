-- Создание таблицы поставщиков для категоризации затрат
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(20),
    category VARCHAR(100) DEFAULT 'Доп. затраты',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем уникальный индекс для имени поставщика
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name_unique ON public.suppliers(name);

-- Добавляем индекс для быстрого поиска по ИНН
CREATE INDEX IF NOT EXISTS idx_suppliers_inn ON public.suppliers(inn);

-- Добавляем некоторых базовых поставщиков из уже имеющихся счетов
INSERT INTO public.suppliers (name, inn, category) VALUES 
('АлРус', '7807147519', 'Материалы'),
('Ал-Профи', '7839120887', 'Профили'),
('Эксперт Рентал Инжиниринг', '784802613697', 'Аренда оборудования')
ON CONFLICT (name) DO NOTHING;

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для автоматического обновления updated_at в таблице suppliers
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON public.suppliers 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();