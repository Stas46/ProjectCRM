-- Обновляем структуру таблицы invoices для соответствия новому API
-- Добавляем недостающие поля

-- Переименовываем vendor в supplier
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'invoices' AND column_name = 'vendor') THEN
        ALTER TABLE public.invoices RENAME COLUMN vendor TO supplier;
    END IF;
END $$;

-- Переименовываем number в invoice_number
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'invoices' AND column_name = 'number') THEN
        ALTER TABLE public.invoices RENAME COLUMN number TO invoice_number;
    END IF;
END $$;

-- Переименовываем amount в total_amount
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'invoices' AND column_name = 'amount') THEN
        ALTER TABLE public.invoices RENAME COLUMN amount TO total_amount;
    END IF;
END $$;

-- Добавляем поле has_vat если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'has_vat') THEN
        ALTER TABLE public.invoices ADD COLUMN has_vat BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Добавляем поле vat_amount если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'vat_amount') THEN
        ALTER TABLE public.invoices ADD COLUMN vat_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;

-- Добавляем поле supplier_inn если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'supplier_inn') THEN
        ALTER TABLE public.invoices ADD COLUMN supplier_inn TEXT;
    END IF;
END $$;

-- Добавляем поле original_file_name если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'original_file_name') THEN
        ALTER TABLE public.invoices ADD COLUMN original_file_name TEXT;
    END IF;
END $$;

-- Добавляем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON public.invoices(supplier);
CREATE INDEX IF NOT EXISTS idx_invoices_category ON public.invoices(category);