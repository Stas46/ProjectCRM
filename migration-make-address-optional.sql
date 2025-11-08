-- Миграция: Сделать поле address необязательным в таблице projects

-- Удаляем NOT NULL ограничение с поля address
ALTER TABLE public.projects 
ALTER COLUMN address DROP NOT NULL;

-- Проверка
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name IN ('title', 'client', 'address');
