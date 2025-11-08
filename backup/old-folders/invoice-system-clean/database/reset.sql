-- ============================================
-- СБРОС И ПЕРЕСОЗДАНИЕ БАЗЫ ДАННЫХ
-- ============================================
-- ВНИМАНИЕ: Это удалит ВСЕ данные!

-- Удаление представлений
DROP VIEW IF EXISTS supplier_totals CASCADE;
DROP VIEW IF EXISTS invoices_with_suppliers CASCADE;

-- Удаление таблиц
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- Удаление функций
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Теперь можно выполнить schema.sql для создания чистой схемы
