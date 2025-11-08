-- ==================================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ ТАБЛИЦЫ INVOICES
-- ==================================================

-- ВАЖНО: Включаем RLS для таблицы invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Удаляем ВСЕ существующие политики (включая новые)
DROP POLICY IF EXISTS "Allow all access for anon" ON public.invoices;
DROP POLICY IF EXISTS "Allow all access for authenticated" ON public.invoices;
DROP POLICY IF EXISTS "Allow all access for service_role" ON public.invoices;
DROP POLICY IF EXISTS "Allow service role access" ON public.invoices;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.invoices;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.invoices;

-- Создаем новые политики, разрешающие доступ для всех ролей (anon, authenticated, service_role)
CREATE POLICY "Allow all access for anon" ON public.invoices
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access for authenticated" ON public.invoices  
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all access for service_role" ON public.invoices
  FOR ALL  
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Проверяем, что RLS включен
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'invoices';

-- Проверяем созданные политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'invoices'
ORDER BY policyname;
