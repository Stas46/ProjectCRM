-- ============================================
-- Настройка Supabase Storage для файлов счетов
-- ============================================

-- Создаем bucket для хранения файлов счетов
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-files',           -- ID bucket
  'invoice-files',           -- Название bucket
  true,                      -- Публичный доступ для чтения
  52428800,                  -- Лимит размера файла: 50 MB
  NULL                       -- Разрешить все MIME типы (PDF, Excel, изображения)
)
ON CONFLICT (id) DO NOTHING; -- Не создавать повторно, если уже существует

-- ============================================
-- Политики доступа (Row Level Security)
-- ============================================

-- 1. Разрешаем аутентифицированным пользователям загружать файлы
CREATE POLICY IF NOT EXISTS "Authenticated users can upload invoice files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoice-files');

-- 2. Разрешаем всем читать файлы (публичный доступ)
CREATE POLICY IF NOT EXISTS "Public can view invoice files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'invoice-files');

-- 3. Разрешаем аутентифицированным пользователям обновлять файлы
CREATE POLICY IF NOT EXISTS "Authenticated users can update invoice files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'invoice-files')
WITH CHECK (bucket_id = 'invoice-files');

-- 4. Разрешаем аутентифицированным пользователям удалять файлы
CREATE POLICY IF NOT EXISTS "Authenticated users can delete invoice files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'invoice-files');

-- ============================================
-- Проверка настройки
-- ============================================

-- Выводим информацию о созданном bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'invoice-files';

-- Выводим список политик для bucket
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
WHERE tablename = 'objects'
  AND policyname LIKE '%invoice%';
