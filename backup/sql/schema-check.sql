-- Функция для получения всех таблиц и их колонок
CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(table_info)
    INTO result
    FROM (
        SELECT 
            t.table_name,
            json_agg(json_build_object(
                'column_name', c.column_name,
                'data_type', c.data_type,
                'is_nullable', c.is_nullable,
                'column_default', c.column_default
            )) as columns
        FROM information_schema.tables t
        JOIN information_schema.columns c 
            ON c.table_name = t.table_name 
            AND c.table_schema = t.table_schema
        WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_name
    ) table_info;
    RETURN result;
END;
$$;

-- Функция для получения RLS политик
CREATE OR REPLACE FUNCTION get_rls_policies()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(policy_info)
    INTO result
    FROM (
        SELECT 
            schemaname,
            tablename,
            policyname,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
    ) policy_info;
    RETURN result;
END;
$$;