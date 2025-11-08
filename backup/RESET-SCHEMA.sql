-- ============================================
-- СБРОС И ОЧИСТКА БАЗЫ ДАННЫХ
-- ============================================
-- ВНИМАНИЕ: Это удалит ВСЕ данные и таблицы!
-- ВАЖНО: Сделайте бэкап перед выполнением!
-- ============================================

-- Шаг 1: Удаление представлений
DROP VIEW IF EXISTS supplier_totals CASCADE;
DROP VIEW IF EXISTS invoices_with_suppliers CASCADE;
DROP VIEW IF EXISTS project_expenses CASCADE;
DROP VIEW IF EXISTS task_summary CASCADE;
DROP VIEW IF EXISTS expense_summary CASCADE;

-- Шаг 2: Удаление ВСЕХ старых таблиц
-- Основные таблицы
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Бригады и смены
DROP TABLE IF EXISTS crews CASCADE;
DROP TABLE IF EXISTS crew_members CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS shift_assignees CASCADE;

-- Сообщения и комментарии
DROP TABLE IF EXISTS project_messages CASCADE;
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;

-- Категории расходов
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS custom_expense_categories CASCADE;

-- Старая система счетов (если есть)
DROP TABLE IF EXISTS contractors CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS unified_items CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS item_name_variants CASCADE;

-- Шаг 3: Удаление функций
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Шаг 4: Очистка Storage (выполнить в Dashboard)
-- Supabase Dashboard → Storage → Удалить bucket "invoices" (если есть)
-- Затем создать новый bucket "invoices" с настройками Public

-- ============================================
-- ГОТОВО К СОЗДАНИЮ ЧИСТОЙ СХЕМЫ
-- ============================================
-- Теперь выполните CREATE-CLEAN-SCHEMA.sql
