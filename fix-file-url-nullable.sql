-- Делаем file_url опциональным для поддержки Excel файлов
-- Excel файлы не загружаются в Storage, поэтому file_url может быть NULL

ALTER TABLE invoices 
ALTER COLUMN file_url DROP NOT NULL;

-- Проверка: показать структуру колонки
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name = 'file_url';
