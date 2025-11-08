-- Добавляем порядковый номер в таблицу invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sequence_number SERIAL;

-- Обновляем существующие записи (назначаем номера по дате создания)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
  FROM invoices
)
UPDATE invoices
SET sequence_number = numbered.new_number
FROM numbered
WHERE invoices.id = numbered.id;

-- Создаем функцию для автоматического назначения следующего номера
CREATE OR REPLACE FUNCTION set_invoice_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequence_number IS NULL THEN
    NEW.sequence_number := (SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM invoices);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DROP TRIGGER IF EXISTS invoice_sequence_trigger ON invoices;
CREATE TRIGGER invoice_sequence_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_sequence_number();
