-- ========================================
-- ПОЛНЫЙ СБРОС СХЕМЫ PUBLIC
-- ВНИМАНИЕ: Удалит ВСЕ таблицы, функции, триггеры!
-- ========================================

-- Удаляем все таблицы с каскадным удалением
DROP TABLE IF EXISTS 
  public.message_attachments,
  public.project_messages,
  public.shift_assignees,
  public.shifts,
  public.crew_members,
  public.crews,
  public.task_attachments,
  public.task_comments,
  public.custom_expense_categories,
  public.tasks,
  public.invoices,
  public.suppliers,
  public.projects,
  public.employees,
  public.clients
CASCADE;

-- Удаляем все функции триггеров
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_project_actual_cost() CASCADE;
DROP FUNCTION IF EXISTS update_supplier_stats() CASCADE;
DROP FUNCTION IF EXISTS set_task_completed_at() CASCADE;
DROP FUNCTION IF EXISTS update_parent_task_subtasks_count() CASCADE;
DROP FUNCTION IF EXISTS update_task_comments_count() CASCADE;
DROP FUNCTION IF EXISTS update_task_attachments_count() CASCADE;
DROP FUNCTION IF EXISTS update_crew_members_count() CASCADE;
DROP FUNCTION IF EXISTS update_shift_assignees_count() CASCADE;
DROP FUNCTION IF EXISTS link_invoice_to_supplier() CASCADE;
DROP FUNCTION IF EXISTS check_invoice_payment_status() CASCADE;

-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Готово к созданию новой схемы
SELECT 'Схема очищена. Теперь выполните complete-schema-part1.sql и complete-schema-part2.sql' as message;
