-- Скрипт для создания диагностической функции
CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Получаем информацию о всех таблицах в схеме public
    SELECT json_agg(table_info)
    INTO result
    FROM (
        SELECT 
            t.table_name,
            (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
            EXISTS (
                SELECT 1 
                FROM pg_indexes 
                WHERE tablename = t.table_name AND schemaname = 'public'
            ) as has_indexes,
            EXISTS (
                SELECT 1 
                FROM pg_trigger 
                WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = t.table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
            ) as has_triggers,
            (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as approx_row_count
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ) table_info;

    RETURN result;
END;
$$;

-- Функция для создания диагностической функции через RPC
CREATE OR REPLACE FUNCTION create_schema_info_function()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Пересоздаем функцию для получения информации о схеме
    EXECUTE '
    CREATE OR REPLACE FUNCTION get_schema_info()
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    DECLARE
        result json;
    BEGIN
        -- Получаем информацию о всех таблицах в схеме public
        SELECT json_agg(table_info)
        INTO result
        FROM (
            SELECT 
                t.table_name,
                (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = ''public'') as column_count,
                EXISTS (
                    SELECT 1 
                    FROM pg_indexes 
                    WHERE tablename = t.table_name AND schemaname = ''public''
                ) as has_indexes,
                EXISTS (
                    SELECT 1 
                    FROM pg_trigger 
                    WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = t.table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ''public''))
                ) as has_triggers,
                (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ''public'')) as approx_row_count
            FROM information_schema.tables t
            WHERE t.table_schema = ''public'' AND t.table_type = ''BASE TABLE''
        ) table_info;

        RETURN result;
    END;
    $func$;
    ';

    RETURN 'Диагностическая функция создана успешно';
END;
$$;