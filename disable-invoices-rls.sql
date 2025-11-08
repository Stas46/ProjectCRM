-- ===================================================
-- ОТКЛЮЧЕНИЕ RLS ДЛЯ ТАБЛИЦ И STORAGE
-- ===================================================

-- 1. Отключаем RLS для таблиц invoices и suppliers
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;

-- 2. Делаем Storage bucket 'invoice-files' публичным
UPDATE storage.buckets 
SET public = true 
WHERE id = 'invoice-files';

-- 3. Создаем политики для Storage (если нужны)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoice-files');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoice-files');

-- ===================================================
-- ИЛИ АЛЬТЕРНАТИВНЫЙ ВАРИАНТ: Создаем RLS политики
-- ===================================================

-- Политики для invoices
DROP POLICY IF EXISTS "Allow public read access to invoices" ON invoices;
CREATE POLICY "Allow public read access to invoices" 
ON invoices FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow public insert access to invoices" ON invoices;
CREATE POLICY "Allow public insert access to invoices" 
ON invoices FOR INSERT 
WITH CHECK (true);

-- Политики для suppliers
DROP POLICY IF EXISTS "Allow public read access to suppliers" ON suppliers;
CREATE POLICY "Allow public read access to suppliers" 
ON suppliers FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow public insert access to suppliers" ON suppliers;
CREATE POLICY "Allow public insert access to suppliers" 
ON suppliers FOR INSERT 
WITH CHECK (true);
