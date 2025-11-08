-- ============================================
-- ЧИСТАЯ СХЕМА БАЗЫ ДАННЫХ
-- Система распознавания счетов
-- ============================================

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ТАБЛИЦА: suppliers (Поставщики)
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основные данные
  name TEXT NOT NULL,
  inn TEXT,
  
  -- Контакты
  phone TEXT,
  email TEXT,
  legal_address TEXT,
  
  -- Категоризация
  category TEXT, -- Категория расходов (строительство, материалы, услуги и т.д.)
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_suppliers_inn ON suppliers(inn);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);

-- Комментарии
COMMENT ON TABLE suppliers IS 'Поставщики товаров и услуг';
COMMENT ON COLUMN suppliers.name IS 'Название поставщика';
COMMENT ON COLUMN suppliers.inn IS 'ИНН поставщика';
COMMENT ON COLUMN suppliers.category IS 'Категория расходов для группировки';

-- ============================================
-- ТАБЛИЦА: invoices (Счета)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  project_id UUID, -- Будущая привязка к проектам (пока без FK)
  
  -- Данные счета
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  
  -- Финансы
  total_amount DECIMAL(15, 2) NOT NULL,
  vat_amount DECIMAL(15, 2), -- НДС (если есть)
  
  -- Файл
  file_url TEXT NOT NULL, -- Ссылка на файл в Supabase Storage
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Комментарии
COMMENT ON TABLE invoices IS 'Счета от поставщиков с распознанными данными';
COMMENT ON COLUMN invoices.supplier_id IS 'ID поставщика (FK к suppliers)';
COMMENT ON COLUMN invoices.project_id IS 'ID проекта (будущая привязка, пока без FK)';
COMMENT ON COLUMN invoices.invoice_number IS 'Номер счета из документа';
COMMENT ON COLUMN invoices.invoice_date IS 'Дата выставления счета';
COMMENT ON COLUMN invoices.total_amount IS 'Общая сумма счета';
COMMENT ON COLUMN invoices.vat_amount IS 'Сумма НДС (если указана в счете)';
COMMENT ON COLUMN invoices.file_url IS 'URL файла в Supabase Storage';

-- ============================================
-- ТРИГГЕРЫ: Обновление updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security) - ОПЦИОНАЛЬНО
-- ============================================
-- Раскомментируйте, если нужна защита на уровне строк

-- ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Suppliers are viewable by everyone"
--   ON suppliers FOR SELECT
--   USING (true);

-- CREATE POLICY "Invoices are viewable by everyone"
--   ON invoices FOR SELECT
--   USING (true);

-- ============================================
-- STORAGE BUCKET для файлов счетов
-- ============================================
-- Выполнить в Supabase Dashboard -> Storage:
-- 1. Создать bucket с именем "invoices"
-- 2. Настроить публичный доступ (или приватный с политиками)

-- SQL для создания bucket (если поддерживается):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('invoices', 'invoices', true);

-- ============================================
-- ПРЕДСТАВЛЕНИЯ (Views) для удобства
-- ============================================

-- Счета с данными поставщика
CREATE OR REPLACE VIEW invoices_with_suppliers AS
SELECT 
  i.id,
  i.invoice_number,
  i.invoice_date,
  i.total_amount,
  i.vat_amount,
  i.file_url,
  i.project_id,
  i.created_at,
  s.id as supplier_id,
  s.name as supplier_name,
  s.inn as supplier_inn,
  s.category as supplier_category
FROM invoices i
LEFT JOIN suppliers s ON i.supplier_id = s.id
ORDER BY i.created_at DESC;

-- Сумма счетов по поставщикам
CREATE OR REPLACE VIEW supplier_totals AS
SELECT 
  s.id,
  s.name,
  s.inn,
  s.category,
  COUNT(i.id) as invoice_count,
  COALESCE(SUM(i.total_amount), 0) as total_amount,
  COALESCE(SUM(i.vat_amount), 0) as total_vat
FROM suppliers s
LEFT JOIN invoices i ON i.supplier_id = s.id
GROUP BY s.id, s.name, s.inn, s.category
ORDER BY total_amount DESC;

COMMENT ON VIEW invoices_with_suppliers IS 'Счета с полной информацией о поставщиках';
COMMENT ON VIEW supplier_totals IS 'Итоговые суммы по каждому поставщику';

-- ============================================
-- ГОТОВО!
-- ============================================
-- База данных готова к использованию
