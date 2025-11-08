-- ==================================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ ОСНОВНЫХ ТАБЛИЦ
-- ==================================================

-- ВАЖНО: Включаем RLS для таблиц
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- ТАБЛИЦА PROJECTS
-- ==================================================

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Allow all access for anon" ON public.projects;
DROP POLICY IF EXISTS "Allow all access for authenticated" ON public.projects;
DROP POLICY IF EXISTS "Allow all access for service_role" ON public.projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.projects;

-- Создаем новые политики
CREATE POLICY "Allow all access for anon" ON public.projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access for authenticated" ON public.projects  
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all access for service_role" ON public.projects
  FOR ALL  
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ==================================================
-- ТАБЛИЦА CLIENTS
-- ==================================================

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Allow all access for anon" ON public.clients;
DROP POLICY IF EXISTS "Allow all access for authenticated" ON public.clients;
DROP POLICY IF EXISTS "Allow all access for service_role" ON public.clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clients;

-- Создаем новые политики
CREATE POLICY "Allow all access for anon" ON public.clients
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access for authenticated" ON public.clients  
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all access for service_role" ON public.clients
  FOR ALL  
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ==================================================
-- ТАБЛИЦА EMPLOYEES
-- ==================================================

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Allow all access for anon" ON public.employees;
DROP POLICY IF EXISTS "Allow all access for authenticated" ON public.employees;
DROP POLICY IF EXISTS "Allow all access for service_role" ON public.employees;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.employees;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.employees;

-- Создаем новые политики
CREATE POLICY "Allow all access for anon" ON public.employees
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access for authenticated" ON public.employees  
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all access for service_role" ON public.employees
  FOR ALL  
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ==================================================
-- ТАБЛИЦА TASKS
-- ==================================================

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Allow all access for anon" ON public.tasks;
DROP POLICY IF EXISTS "Allow all access for authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Allow all access for service_role" ON public.tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.tasks;

-- Создаем новые политики
CREATE POLICY "Allow all access for anon" ON public.tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access for authenticated" ON public.tasks  
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all access for service_role" ON public.tasks
  FOR ALL  
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ==================================================
-- ПРОВЕРКА
-- ==================================================

-- Проверяем, что RLS включен
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('projects', 'clients', 'employees', 'tasks')
ORDER BY tablename;

-- Проверяем созданные политики
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('projects', 'clients', 'employees', 'tasks')
ORDER BY tablename, policyname;
