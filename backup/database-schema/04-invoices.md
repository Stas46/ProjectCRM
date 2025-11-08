# 🧾 Таблица: INVOICES (Счета)

## 📋 Описание
Таблица для хранения счетов от поставщиков. Поддерживает автоматическое распознавание через OCR (Google Cloud Vision API).
Счета привязаны к проектам и поставщикам для учета затрат.

## 🗃️ Структура таблицы

```sql
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- Проект, к которому относится счет
  
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  -- Связь с поставщиком (новое поле!)
  
  -- Информация о поставщике (для совместимости и истории)
  supplier_name VARCHAR(255) NOT NULL,
  -- Название поставщика (может отличаться от suppliers.name)
  
  supplier_inn VARCHAR(12),
  -- ИНН поставщика
  
  supplier_kpp VARCHAR(9),
  -- КПП поставщика
  
  supplier_address TEXT,
  -- Адрес поставщика
  
  -- Реквизиты счета
  invoice_number VARCHAR(100) NOT NULL,
  -- Номер счета
  
  invoice_date DATE,
  -- Дата счета (может отличаться от issue_date)
  
  issue_date DATE NOT NULL,
  -- Дата выставления
  
  due_date DATE,
  -- Срок оплаты
  
  payment_date DATE,
  -- Фактическая дата оплаты
  
  -- Суммы
  subtotal_amount NUMERIC(15, 2),
  -- Сумма без НДС
  
  vat_rate NUMERIC(5, 2),
  -- Ставка НДС (0, 10, 20)
  
  vat_amount NUMERIC(15, 2),
  -- Сумма НДС
  
  total_amount NUMERIC(15, 2) NOT NULL,
  -- Итоговая сумма с НДС
  
  has_vat BOOLEAN DEFAULT true,
  -- Есть ли НДС
  
  currency VARCHAR(3) DEFAULT 'RUB',
  -- Валюта (RUB, USD, EUR и т.д.)
  
  -- Категоризация
  category VARCHAR(50) NOT NULL DEFAULT 'additional',
  -- Категория затрат из ExpenseCategory
  
  subcategory VARCHAR(100),
  -- Подкатегория (опционально, для детализации)
  
  -- Статус оплаты
  payment_status VARCHAR(20) DEFAULT 'pending',
  -- pending - ожидает оплаты
  -- partially_paid - частично оплачен
  -- paid - оплачен
  -- overdue - просрочен
  -- cancelled - отменен
  
  paid_amount NUMERIC(15, 2) DEFAULT 0,
  -- Уже оплаченная сумма (для частичной оплаты)
  
  -- Файлы и OCR
  file_url TEXT,
  -- URL файла счета (путь в Supabase Storage или /api/files/)
  
  original_file_name VARCHAR(500),
  -- Оригинальное имя файла
  
  file_size INTEGER,
  -- Размер файла в байтах
  
  file_mime_type VARCHAR(100),
  -- MIME тип файла (application/pdf, image/jpeg и т.д.)
  
  ocr_status VARCHAR(20) DEFAULT 'pending',
  -- pending - ожидает обработки
  -- processing - обрабатывается
  -- completed - обработан
  -- failed - ошибка
  -- manual - введен вручную
  
  ocr_confidence NUMERIC(5, 2),
  -- Уверенность OCR (0-100%)
  
  ocr_raw_text TEXT,
  -- Полный текст, распознанный OCR
  
  ocr_data JSONB,
  -- Структурированные данные OCR в JSON
  -- Пример: {"supplier": {...}, "items": [...], "totals": {...}}
  
  -- Дополнительная информация
  description TEXT,
  -- Описание, за что счет
  
  items JSONB,
  -- Позиции счета в формате JSON
  -- Пример: [{"name": "Профиль", "quantity": 10, "price": 1000, "total": 10000}]
  
  notes TEXT,
  -- Примечания, комментарии
  
  tags TEXT[],
  -- Теги для поиска
  
  -- Договор
  contract_number VARCHAR(100),
  -- Номер договора
  
  contract_date DATE,
  -- Дата договора
  
  -- Доставка
  delivery_date DATE,
  -- Дата поставки
  
  delivery_address TEXT,
  -- Адрес доставки
  
  -- Ответственные
  responsible_person_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  -- Ответственный за оплату/приемку
  
  approved_by_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  -- Кто одобрил счет
  
  approved_at TIMESTAMP WITH TIME ZONE,
  -- Когда одобрен
  
  -- Метаданные
  is_recurring BOOLEAN DEFAULT false,
  -- Регулярный платеж
  
  recurrence_period VARCHAR(20),
  -- monthly, quarterly, yearly
  
  parent_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  -- Родительский счет (для повторяющихся)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_payment_status CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT chk_ocr_status CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'manual')),
  CONSTRAINT chk_category CHECK (category IN (
    'profile', 'components', 'fittings', 'glass', 'glass_units', 
    'sealants', 'materials', 'manufacturing', 'design', 'delivery',
    'lifting_equipment', 'brackets', 'hardware', 'adjoining', 
    'installation', 'additional', 'custom'
  )),
  CONSTRAINT chk_amounts CHECK (
    total_amount >= 0 AND 
    (subtotal_amount IS NULL OR subtotal_amount >= 0) AND
    (vat_amount IS NULL OR vat_amount >= 0) AND
    paid_amount >= 0 AND
    paid_amount <= total_amount
  ),
  CONSTRAINT chk_dates CHECK (
    (due_date IS NULL OR issue_date IS NULL OR due_date >= issue_date) AND
    (payment_date IS NULL OR issue_date IS NULL OR payment_date >= issue_date)
  ),
  CONSTRAINT chk_vat_rate CHECK (vat_rate IS NULL OR vat_rate IN (0, 10, 20))
);
```

## 📊 Индексы

```sql
-- Поиск по проекту (самый частый запрос)
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);

-- Поиск по поставщику
CREATE INDEX idx_invoices_supplier_id ON public.invoices(supplier_id);
CREATE INDEX idx_invoices_supplier_name ON public.invoices(supplier_name);
CREATE INDEX idx_invoices_supplier_inn ON public.invoices(supplier_inn) WHERE supplier_inn IS NOT NULL;

-- Поиск по номеру счета
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);

-- Фильтр по дате выставления
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date DESC);

-- Фильтр по дате оплаты
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date) WHERE due_date IS NOT NULL;

-- Фильтр по статусу оплаты
CREATE INDEX idx_invoices_payment_status ON public.invoices(payment_status);

-- Фильтр по категории
CREATE INDEX idx_invoices_category ON public.invoices(category);

-- Фильтр по статусу OCR
CREATE INDEX idx_invoices_ocr_status ON public.invoices(ocr_status);

-- Составной индекс для неоплаченных счетов
CREATE INDEX idx_invoices_unpaid ON public.invoices(project_id, payment_status, due_date)
  WHERE payment_status IN ('pending', 'partially_paid', 'overdue');

-- Составной индекс для отчетов по датам и категориям
CREATE INDEX idx_invoices_date_category ON public.invoices(issue_date, category, project_id);

-- Полнотекстовый поиск по OCR
CREATE INDEX idx_invoices_ocr_search ON public.invoices 
  USING gin(to_tsvector('russian', COALESCE(ocr_raw_text, '') || ' ' || COALESCE(description, '')));

-- GIN индекс для JSONB полей
CREATE INDEX idx_invoices_ocr_data ON public.invoices USING gin(ocr_data);
CREATE INDEX idx_invoices_items ON public.invoices USING gin(items);

-- Поиск по тегам
CREATE INDEX idx_invoices_tags ON public.invoices USING gin(tags);
```

## 🔗 Связи

### Входящие связи (к invoices)
- `projects` - Проект (N:1, обязательная)
- `suppliers` - Поставщик (N:1, опциональная)
- `employees` (responsible_person_id) - Ответственный (N:1, опциональная)
- `employees` (approved_by_id) - Одобривший (N:1, опциональная)
- `invoices` (parent_invoice_id) - Родительский счет (N:1, опциональная)

## 📝 Примеры использования

### Создание счета вручную
```sql
INSERT INTO public.invoices (
  project_id, supplier_id, supplier_name, supplier_inn,
  invoice_number, issue_date, due_date,
  subtotal_amount, vat_rate, vat_amount, total_amount, has_vat,
  category, description, payment_status, ocr_status
) VALUES (
  'project-uuid-here',
  'supplier-uuid-here',
  'Профиль-Мастер',
  '7707123456',
  'СЧ-2025-0123',
  '2025-10-12',
  '2025-10-26',
  100000.00,
  20.00,
  20000.00,
  120000.00,
  true,
  'profile',
  'Алюминиевый профиль для проекта ЖК Солнечный',
  'pending',
  'manual'
);
```

### Создание счета из OCR
```sql
INSERT INTO public.invoices (
  project_id, supplier_name, supplier_inn,
  invoice_number, issue_date, total_amount, has_vat,
  category, file_url, original_file_name, file_size, file_mime_type,
  ocr_status, ocr_confidence, ocr_raw_text, ocr_data,
  payment_status
) VALUES (
  'project-uuid-here',
  'ООО "Стекло-Центр"',
  '7812345678',
  'No. 456',
  '2025-10-10',
  85000.00,
  true,
  'glass',
  'https://supabase.co/storage/.../invoice_123.pdf',
  'invoice_steklo_centr_456.pdf',
  245678,
  'application/pdf',
  'completed',
  95.5,
  'СЧЕТ No. 456 от 10.10.2025...',
  '{"supplier": {"name": "ООО Стекло-Центр", "inn": "7812345678"}, "items": [...]}',
  'pending'
);
```

### Обновление статуса оплаты
```sql
UPDATE public.invoices
SET 
  payment_status = 'paid',
  payment_date = CURRENT_DATE,
  paid_amount = total_amount,
  updated_at = NOW()
WHERE id = 'invoice-uuid-here';
```

### Частичная оплата
```sql
UPDATE public.invoices
SET 
  payment_status = 'partially_paid',
  paid_amount = paid_amount + 50000.00,
  updated_at = NOW()
WHERE id = 'invoice-uuid-here';
```

### Автоматическое определение просроченных счетов
```sql
UPDATE public.invoices
SET payment_status = 'overdue'
WHERE payment_status = 'pending'
  AND due_date < CURRENT_DATE
  AND due_date IS NOT NULL;
```

### Получение счетов проекта с информацией о поставщиках
```sql
SELECT 
  i.*,
  s.name as supplier_full_name,
  s.phone as supplier_phone,
  s.email as supplier_email,
  s.rating as supplier_rating,
  p.title as project_title,
  e.name as responsible_person_name
FROM public.invoices i
LEFT JOIN public.suppliers s ON i.supplier_id = s.id
LEFT JOIN public.projects p ON i.project_id = p.id
LEFT JOIN public.employees e ON i.responsible_person_id = e.id
WHERE i.project_id = 'project-uuid-here'
ORDER BY i.issue_date DESC;
```

## 🎯 Поля для TypeScript

```typescript
export interface Invoice {
  id: string;
  project_id: string;
  supplier_id?: string;
  
  // Поставщик
  supplier_name: string;
  supplier_inn?: string;
  supplier_kpp?: string;
  supplier_address?: string;
  
  // Реквизиты
  invoice_number: string;
  invoice_date?: string;
  issue_date: string;
  due_date?: string;
  payment_date?: string;
  
  // Суммы
  subtotal_amount?: number;
  vat_rate?: number;
  vat_amount?: number;
  total_amount: number;
  has_vat: boolean;
  currency: string;
  
  // Категория
  category: ExpenseCategory;
  subcategory?: string;
  
  // Статус
  payment_status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  
  // Файлы
  file_url?: string;
  original_file_name?: string;
  file_size?: number;
  file_mime_type?: string;
  
  // OCR
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed' | 'manual';
  ocr_confidence?: number;
  ocr_raw_text?: string;
  ocr_data?: InvoiceOCRData;
  
  // Дополнительно
  description?: string;
  items?: InvoiceItem[];
  notes?: string;
  tags?: string[];
  
  // Договор
  contract_number?: string;
  contract_date?: string;
  
  // Доставка
  delivery_date?: string;
  delivery_address?: string;
  
  // Ответственные
  responsible_person_id?: string;
  approved_by_id?: string;
  approved_at?: string;
  
  // Регулярность
  is_recurring: boolean;
  recurrence_period?: 'monthly' | 'quarterly' | 'yearly';
  parent_invoice_id?: string;
  
  created_at: string;
  updated_at?: string;
  
  // Связанные данные
  supplier?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    rating?: number;
  };
  project?: {
    id: string;
    title: string;
    client: string;
  };
}

export interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  price: number;
  total: number;
  vat_rate?: number;
  vat_amount?: number;
}

export interface InvoiceOCRData {
  supplier?: {
    name?: string;
    inn?: string;
    kpp?: string;
    address?: string;
    phone?: string;
  };
  invoice_number?: string;
  invoice_date?: string;
  items?: InvoiceItem[];
  totals?: {
    subtotal?: number;
    vat?: number;
    total?: number;
  };
  confidence?: {
    supplier?: number;
    number?: number;
    date?: number;
    amount?: number;
  };
}

export type NewInvoice = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInvoice = Partial<NewInvoice>;
```

## 🔄 Триггеры

```sql
-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Автоматическое обновление статуса при полной оплате
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount >= NEW.total_amount THEN
    NEW.payment_status = 'paid';
    IF NEW.payment_date IS NULL THEN
      NEW.payment_date = CURRENT_DATE;
    END IF;
  ELSIF NEW.paid_amount > 0 THEN
    NEW.payment_status = 'partially_paid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_check_payment_status
  BEFORE UPDATE OF paid_amount ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payment_status();

-- Автоматический расчет НДС
CREATE OR REPLACE FUNCTION calculate_invoice_vat()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.has_vat AND NEW.vat_rate IS NOT NULL AND NEW.subtotal_amount IS NOT NULL THEN
    NEW.vat_amount = ROUND(NEW.subtotal_amount * NEW.vat_rate / 100, 2);
    NEW.total_amount = NEW.subtotal_amount + NEW.vat_amount;
  ELSIF NOT NEW.has_vat THEN
    NEW.vat_amount = 0;
    NEW.vat_rate = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_calculate_vat
  BEFORE INSERT OR UPDATE OF subtotal_amount, vat_rate, has_vat ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_vat();

-- Привязка к поставщику по ИНН
CREATE OR REPLACE FUNCTION link_invoice_to_supplier()
RETURNS TRIGGER AS $$
DECLARE
  found_supplier_id UUID;
BEGIN
  IF NEW.supplier_id IS NULL AND NEW.supplier_inn IS NOT NULL THEN
    SELECT id INTO found_supplier_id
    FROM public.suppliers
    WHERE inn = NEW.supplier_inn
    LIMIT 1;
    
    IF found_supplier_id IS NOT NULL THEN
      NEW.supplier_id = found_supplier_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_link_supplier
  BEFORE INSERT OR UPDATE OF supplier_inn ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION link_invoice_to_supplier();
```

## 📈 Представления (Views)

```sql
-- Счета с полной информацией
CREATE OR REPLACE VIEW invoices_extended AS
SELECT 
  i.*,
  p.title as project_title,
  p.client as project_client,
  p.address as project_address,
  s.name as supplier_full_name,
  s.phone as supplier_phone,
  s.email as supplier_email,
  s.rating as supplier_rating,
  s.category as supplier_category,
  e1.name as responsible_person_name,
  e2.name as approved_by_name,
  i.total_amount - i.paid_amount as remaining_amount,
  CASE 
    WHEN i.payment_status = 'paid' THEN 'Оплачен'
    WHEN i.due_date < CURRENT_DATE AND i.payment_status = 'pending' THEN 'Просрочен'
    WHEN i.due_date IS NOT NULL THEN CURRENT_DATE - i.due_date || ' дн.'
    ELSE NULL
  END as payment_info
FROM public.invoices i
LEFT JOIN public.projects p ON i.project_id = p.id
LEFT JOIN public.suppliers s ON i.supplier_id = s.id
LEFT JOIN public.employees e1 ON i.responsible_person_id = e1.id
LEFT JOIN public.employees e2 ON i.approved_by_id = e2.id;

-- Просроченные счета
CREATE OR REPLACE VIEW invoices_overdue AS
SELECT 
  i.*,
  p.title as project_title,
  CURRENT_DATE - i.due_date as days_overdue,
  i.total_amount - i.paid_amount as amount_overdue
FROM public.invoices i
JOIN public.projects p ON i.project_id = p.id
WHERE i.payment_status IN ('pending', 'partially_paid')
  AND i.due_date < CURRENT_DATE
ORDER BY i.due_date ASC;

-- Счета на оплату в ближайшие 7 дней
CREATE OR REPLACE VIEW invoices_due_soon AS
SELECT 
  i.*,
  p.title as project_title,
  i.due_date - CURRENT_DATE as days_until_due
FROM public.invoices i
JOIN public.projects p ON i.project_id = p.id
WHERE i.payment_status = 'pending'
  AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY i.due_date ASC;
```

## 📊 Статистика и отчеты

```sql
-- Статистика по проекту
SELECT 
  project_id,
  COUNT(*) as invoices_count,
  SUM(total_amount) as total_invoiced,
  SUM(paid_amount) as total_paid,
  SUM(total_amount) - SUM(paid_amount) as total_remaining,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
  COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_count
FROM public.invoices
WHERE project_id = 'project-uuid-here'
GROUP BY project_id;

-- Статистика по категориям
SELECT 
  category,
  COUNT(*) as count,
  SUM(total_amount) as total_amount,
  AVG(total_amount) as avg_amount,
  MIN(issue_date) as first_invoice,
  MAX(issue_date) as last_invoice
FROM public.invoices
GROUP BY category
ORDER BY total_amount DESC;

-- Статистика по поставщикам
SELECT 
  supplier_name,
  supplier_inn,
  COUNT(*) as invoices_count,
  SUM(total_amount) as total_amount,
  AVG(total_amount) as avg_amount,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
  COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_count
FROM public.invoices
GROUP BY supplier_name, supplier_inn
HAVING COUNT(*) > 0
ORDER BY total_amount DESC
LIMIT 20;

-- Анализ по месяцам
SELECT 
  DATE_TRUNC('month', issue_date) as month,
  COUNT(*) as invoices_count,
  SUM(total_amount) as total_amount,
  SUM(CASE WHEN has_vat THEN vat_amount ELSE 0 END) as total_vat,
  COUNT(DISTINCT supplier_name) as unique_suppliers,
  COUNT(DISTINCT project_id) as unique_projects
FROM public.invoices
WHERE issue_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', issue_date)
ORDER BY month DESC;

-- OCR статистика
SELECT 
  ocr_status,
  COUNT(*) as count,
  AVG(ocr_confidence) as avg_confidence,
  COUNT(CASE WHEN ocr_confidence >= 90 THEN 1 END) as high_confidence_count
FROM public.invoices
WHERE ocr_status IN ('completed', 'failed')
GROUP BY ocr_status;
```

## 🔍 Функции поиска

```sql
-- Поиск счетов с фильтрами
CREATE OR REPLACE FUNCTION search_invoices(
  search_project_id UUID DEFAULT NULL,
  search_supplier_id UUID DEFAULT NULL,
  search_category VARCHAR(50) DEFAULT NULL,
  search_payment_status VARCHAR(20) DEFAULT NULL,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  min_amount NUMERIC DEFAULT NULL,
  max_amount NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  invoice_number VARCHAR,
  supplier_name VARCHAR,
  issue_date DATE,
  total_amount NUMERIC,
  payment_status VARCHAR,
  category VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.project_id,
    i.invoice_number,
    i.supplier_name,
    i.issue_date,
    i.total_amount,
    i.payment_status,
    i.category
  FROM public.invoices i
  WHERE (search_project_id IS NULL OR i.project_id = search_project_id)
    AND (search_supplier_id IS NULL OR i.supplier_id = search_supplier_id)
    AND (search_category IS NULL OR i.category = search_category)
    AND (search_payment_status IS NULL OR i.payment_status = search_payment_status)
    AND (date_from IS NULL OR i.issue_date >= date_from)
    AND (date_to IS NULL OR i.issue_date <= date_to)
    AND (min_amount IS NULL OR i.total_amount >= min_amount)
    AND (max_amount IS NULL OR i.total_amount <= max_amount)
  ORDER BY i.issue_date DESC;
END;
$$ LANGUAGE plpgsql;
```

## ✅ Валидация

- `project_id` - обязательно, должен существовать в projects
- `supplier_name` - обязательно, максимум 255 символов
- `invoice_number` - обязательно, максимум 100 символов
- `issue_date` - обязательно, DATE format
- `total_amount` - обязательно, >= 0
- `paid_amount` - >= 0, <= total_amount
- `category` - обязательно, из списка ExpenseCategory
- `payment_status` - из списка: pending, partially_paid, paid, overdue, cancelled
- `ocr_status` - из списка: pending, processing, completed, failed, manual
- `vat_rate` - 0, 10 или 20
- `due_date` >= issue_date (если указаны)
- `payment_date` >= issue_date (если указаны)
