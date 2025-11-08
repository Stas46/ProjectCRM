-- Проверка статуса RLS для всех таблиц
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('invoices', 'suppliers', 'projects', 'tasks')
ORDER BY tablename;

-- Проверка политик RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('invoices', 'suppliers', 'projects', 'tasks')
ORDER BY tablename, policyname;
