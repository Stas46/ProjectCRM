-- Получаем структуру всех таблиц в схеме public
SELECT 
    table_name,
    column_name, 
    data_type, 
    column_default, 
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;