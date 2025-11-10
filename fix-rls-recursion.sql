-- ===================================
-- ИСПРАВЛЕНИЕ ПОЛИТИК RLS (БЕЗ РЕКУРСИИ)
-- ===================================

-- Удаляем все старые политики
DROP POLICY IF EXISTS "Пользователи могут видеть свой профиль" ON profiles;
DROP POLICY IF EXISTS "Админы видят все профили" ON profiles;
DROP POLICY IF EXISTS "Профили создаются автоматически" ON profiles;
DROP POLICY IF EXISTS "Пользователи могут обновлять свой профиль" ON profiles;
DROP POLICY IF EXISTS "Админы могут обновлять любые профили" ON profiles;

-- ПРОСТЫЕ ПОЛИТИКИ БЕЗ РЕКУРСИИ

-- 1. Чтение: каждый видит свой профиль
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 2. Вставка: только для своего ID
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Обновление: только свой профиль
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. Удаление: только свой профиль
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- Проверка политик
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Проверка профиля
SELECT * FROM profiles WHERE id = '36a82146-9a14-4689-9795-a9b0f1816032';
