# 🏢 Таблица: SUPPLIERS (Поставщики)

## 📋 Описание
Таблица для хранения информации о поставщиках материалов, оборудования и услуг.
Связана с таблицей счетов и используется для автоматической категоризации затрат.

## 🗃️ Структура таблицы

```sql
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  name VARCHAR(255) NOT NULL,
  -- Название организации
  
  full_name TEXT,
  -- Полное юридическое название
  
  inn VARCHAR(12) UNIQUE,
  -- ИНН (10 цифр для организаций, 12 для ИП)
  
  kpp VARCHAR(9),
  -- КПП (только для юридических лиц)
  
  ogrn VARCHAR(15),
  -- ОГРН/ОГРНИП
  
  -- Категория затрат
  category VARCHAR(50) NOT NULL DEFAULT 'additional',
  -- Категория поставляемых материалов/услуг
  -- Значения из ExpenseCategory enum
  
  -- Контактная информация
  phone VARCHAR(50),
  -- Основной телефон
  
  phone_additional VARCHAR(50),
  -- Дополнительный телефон
  
  email VARCHAR(255),
  -- Email для связи
  
  website VARCHAR(500),
  -- Сайт компании
  
  -- Адреса
  legal_address TEXT,
  -- Юридический адрес
  
  actual_address TEXT,
  -- Фактический адрес
  
  warehouse_address TEXT,
  -- Адрес склада (для поставщиков материалов)
  
  -- Контактное лицо
  contact_person VARCHAR(255),
  -- ФИО контактного лица
  
  contact_person_position VARCHAR(100),
  -- Должность
  
  contact_person_phone VARCHAR(50),
  -- Телефон контактного лица
  
  contact_person_email VARCHAR(255),
  -- Email контактного лица
  
  -- Банковские реквизиты
  bank_name VARCHAR(255),
  -- Наименование банка
  
  bank_bik VARCHAR(9),
  -- БИК банка
  
  bank_account VARCHAR(20),
  -- Расчетный счет
  
  bank_correspondent_account VARCHAR(20),
  -- Корреспондентский счет
  
  -- Условия работы
  payment_terms VARCHAR(100),
  -- Условия оплаты (предоплата, отсрочка и т.д.)
  
  delivery_terms TEXT,
  -- Условия доставки
  
  min_order_amount NUMERIC(12, 2),
  -- Минимальная сумма заказа
  
  discount_percent NUMERIC(5, 2),
  -- Процент скидки
  
  credit_limit NUMERIC(15, 2),
  -- Кредитный лимит
  
  -- Рейтинг и статус
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  -- Рейтинг поставщика (1-5)
  
  is_active BOOLEAN DEFAULT true,
  -- Активен ли поставщик
  
  is_verified BOOLEAN DEFAULT false,
  -- Проверен ли поставщик
  
  priority INTEGER DEFAULT 0,
  -- Приоритет (для сортировки при выборе)
  
  -- Статистика
  total_orders INTEGER DEFAULT 0,
  -- Количество заказов
  
  total_amount NUMERIC(15, 2) DEFAULT 0,
  -- Общая сумма заказов
  
  last_order_date DATE,
  -- Дата последнего заказа
  
  -- Дополнительная информация
  description TEXT,
  -- Описание, специализация
  
  tags TEXT[],
  -- Теги для поиска (массив строк)
  
  notes TEXT,
  -- Заметки, важная информация
  
  documents JSONB,
  -- Документы в формате JSON (договоры, сертификаты и т.д.)
  -- Пример: [{"type": "contract", "number": "123", "date": "2025-01-01", "file_url": "..."}]
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_category CHECK (category IN (
    'profile', 'components', 'fittings', 'glass', 'glass_units', 
    'sealants', 'materials', 'manufacturing', 'design', 'delivery',
    'lifting_equipment', 'brackets', 'hardware', 'adjoining', 
    'installation', 'additional', 'custom'
  )),
  CONSTRAINT chk_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  CONSTRAINT chk_discount CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100))
);
```

## 📊 Индексы

```sql
-- Поиск по названию (самый частый запрос)
CREATE INDEX idx_suppliers_name ON public.suppliers(name);

-- Поиск по ИНН
CREATE INDEX idx_suppliers_inn ON public.suppliers(inn) WHERE inn IS NOT NULL;

-- Фильтр по категории
CREATE INDEX idx_suppliers_category ON public.suppliers(category);

-- Фильтр по статусу
CREATE INDEX idx_suppliers_is_active ON public.suppliers(is_active);

-- Сортировка по приоритету
CREATE INDEX idx_suppliers_priority ON public.suppliers(priority DESC);

-- Полнотекстовый поиск
CREATE INDEX idx_suppliers_search ON public.suppliers 
  USING gin(to_tsvector('russian', name || ' ' || COALESCE(description, '')));

-- Поиск по тегам
CREATE INDEX idx_suppliers_tags ON public.suppliers USING gin(tags);

-- Составной индекс для активных поставщиков по категориям
CREATE INDEX idx_suppliers_active_category ON public.suppliers(is_active, category) 
  WHERE is_active = true;
```

## 🔗 Связи

### Исходящие связи (от suppliers)
- `invoices` - Счета от поставщика (1:N)

## 📝 Примеры использования

### Создание поставщика материалов
```sql
INSERT INTO public.suppliers (
  name, full_name, inn, kpp, ogrn,
  category, phone, email, website,
  legal_address, actual_address,
  contact_person, contact_person_phone, contact_person_email,
  payment_terms, delivery_terms, min_order_amount, discount_percent,
  rating, is_verified, description, tags
) VALUES (
  'Профиль-Мастер',
  'ООО "Профиль-Мастер"',
  '7707123456',
  '770701001',
  '1027700123456',
  'profile',
  '+7 (495) 123-45-67',
  'info@profile-master.ru',
  'https://profile-master.ru',
  'г. Москва, ул. Производственная, д. 5',
  'г. Москва, ул. Производственная, д. 5, склад 2',
  'Сидоров Петр Иванович',
  '+7 (495) 123-45-68',
  'sidorov@profile-master.ru',
  'Отсрочка платежа 14 дней',
  'Доставка по Москве бесплатно от 50 000 руб',
  50000.00,
  5.00,
  5,
  true,
  'Поставка алюминиевых и ПВХ профилей премиум класса. Работаем с Rehau, KBE, Veka.',
  ARRAY['профиль', 'алюминий', 'пвх', 'rehau', 'kbe', 'veka']
);
```

### Создание поставщика услуг
```sql
INSERT INTO public.suppliers (
  name, inn, category,
  phone, email,
  contact_person, contact_person_phone,
  payment_terms, rating, description
) VALUES (
  'СпецМонтаж',
  '784802613697',
  'installation',
  '+7 (812) 987-65-43',
  'office@specmontazh.ru',
  'Иванов Алексей',
  '+7 (812) 987-65-44',
  'Оплата по факту выполнения работ',
  4,
  'Монтажные работы любой сложности. Опыт более 10 лет.'
);
```

### Обновление статистики после создания счета
```sql
UPDATE public.suppliers
SET 
  total_orders = total_orders + 1,
  total_amount = total_amount + 125000.00,
  last_order_date = CURRENT_DATE,
  updated_at = NOW()
WHERE id = 'supplier-uuid-here';
```

### Поиск поставщиков по категории и рейтингу
```sql
SELECT 
  id, name, phone, email, rating,
  total_orders, total_amount, last_order_date
FROM public.suppliers
WHERE category = 'profile'
  AND is_active = true
  AND rating >= 4
ORDER BY priority DESC, rating DESC, total_orders DESC;
```

### Полнотекстовый поиск
```sql
SELECT 
  id, name, category, phone, email, rating
FROM public.suppliers
WHERE is_active = true
  AND to_tsvector('russian', name || ' ' || COALESCE(description, '')) 
      @@ plainto_tsquery('russian', 'алюминиевый профиль')
ORDER BY rating DESC;
```

## 🎯 Поля для TypeScript

```typescript
export interface Supplier {
  id: string;
  name: string;
  full_name?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  
  category: ExpenseCategory;
  
  // Контакты
  phone?: string;
  phone_additional?: string;
  email?: string;
  website?: string;
  
  // Адреса
  legal_address?: string;
  actual_address?: string;
  warehouse_address?: string;
  
  // Контактное лицо
  contact_person?: string;
  contact_person_position?: string;
  contact_person_phone?: string;
  contact_person_email?: string;
  
  // Банк
  bank_name?: string;
  bank_bik?: string;
  bank_account?: string;
  bank_correspondent_account?: string;
  
  // Условия
  payment_terms?: string;
  delivery_terms?: string;
  min_order_amount?: number;
  discount_percent?: number;
  credit_limit?: number;
  
  // Статус
  rating?: number; // 1-5
  is_active: boolean;
  is_verified: boolean;
  priority: number;
  
  // Статистика
  total_orders: number;
  total_amount: number;
  last_order_date?: string;
  
  // Дополнительно
  description?: string;
  tags?: string[];
  notes?: string;
  documents?: SupplierDocument[];
  
  created_at: string;
  updated_at?: string;
}

export interface SupplierDocument {
  type: 'contract' | 'certificate' | 'license' | 'other';
  number?: string;
  date?: string;
  expiry_date?: string;
  file_url?: string;
  description?: string;
}

export type NewSupplier = Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'total_orders' | 'total_amount' | 'last_order_date'>;
export type UpdateSupplier = Partial<NewSupplier>;
```

## 🔄 Триггеры

```sql
-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_updated_at();

-- Автоматическое обновление статистики при добавлении счета
CREATE OR REPLACE FUNCTION update_supplier_stats_on_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.suppliers
    SET 
      total_orders = total_orders + 1,
      total_amount = total_amount + NEW.total_amount,
      last_order_date = NEW.issue_date
    WHERE name = NEW.supplier_name OR inn = NEW.supplier_inn;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Обновляем старого поставщика
    UPDATE public.suppliers
    SET 
      total_amount = total_amount - OLD.total_amount + NEW.total_amount
    WHERE name = OLD.supplier_name OR inn = OLD.supplier_inn;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.suppliers
    SET 
      total_orders = GREATEST(0, total_orders - 1),
      total_amount = GREATEST(0, total_amount - OLD.total_amount)
    WHERE name = OLD.supplier_name OR inn = OLD.supplier_inn;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_update_supplier_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_stats_on_invoice();
```

## 📈 Представления (Views)

```sql
-- Топ поставщиков по объему заказов
CREATE OR REPLACE VIEW suppliers_top AS
SELECT 
  s.*,
  COUNT(i.id) as invoices_count,
  SUM(i.total_amount) as calculated_total,
  MAX(i.issue_date) as latest_invoice_date
FROM public.suppliers s
LEFT JOIN public.invoices i ON i.supplier_name = s.name OR i.supplier_inn = s.inn
WHERE s.is_active = true
GROUP BY s.id
ORDER BY calculated_total DESC NULLS LAST
LIMIT 50;

-- Поставщики с просроченной активностью
CREATE OR REPLACE VIEW suppliers_inactive AS
SELECT 
  s.*,
  CURRENT_DATE - s.last_order_date as days_since_last_order
FROM public.suppliers s
WHERE s.is_active = true
  AND s.last_order_date IS NOT NULL
  AND s.last_order_date < CURRENT_DATE - INTERVAL '90 days'
ORDER BY s.last_order_date ASC;
```

## 📊 Статистика

```sql
-- Статистика по категориям
SELECT 
  category,
  COUNT(*) as suppliers_count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count,
  SUM(total_orders) as total_orders,
  SUM(total_amount) as total_amount,
  AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating
FROM public.suppliers
GROUP BY category
ORDER BY total_amount DESC;

-- Самые надежные поставщики
SELECT 
  name, category, rating,
  total_orders, total_amount,
  ROUND(total_amount / NULLIF(total_orders, 0), 2) as avg_order_amount
FROM public.suppliers
WHERE is_active = true
  AND rating >= 4
  AND total_orders >= 5
ORDER BY rating DESC, total_orders DESC
LIMIT 20;

-- Анализ по срокам оплаты
SELECT 
  payment_terms,
  COUNT(*) as count,
  SUM(total_amount) as total_volume
FROM public.suppliers
WHERE is_active = true
  AND payment_terms IS NOT NULL
GROUP BY payment_terms
ORDER BY total_volume DESC;
```

## 🔍 Функции поиска

```sql
-- Поиск поставщиков по различным критериям
CREATE OR REPLACE FUNCTION search_suppliers(
  search_term TEXT DEFAULT NULL,
  search_category VARCHAR(50) DEFAULT NULL,
  min_rating INTEGER DEFAULT NULL,
  only_active BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  category VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  rating INTEGER,
  total_orders INTEGER,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.category,
    s.phone,
    s.email,
    s.rating,
    s.total_orders,
    CASE 
      WHEN search_term IS NOT NULL THEN
        ts_rank(
          to_tsvector('russian', s.name || ' ' || COALESCE(s.description, '')),
          plainto_tsquery('russian', search_term)
        )
      ELSE 1.0
    END as relevance
  FROM public.suppliers s
  WHERE (only_active = false OR s.is_active = true)
    AND (search_category IS NULL OR s.category = search_category)
    AND (min_rating IS NULL OR s.rating >= min_rating)
    AND (search_term IS NULL OR 
         to_tsvector('russian', s.name || ' ' || COALESCE(s.description, '')) 
         @@ plainto_tsquery('russian', search_term))
  ORDER BY relevance DESC, s.priority DESC, s.rating DESC;
END;
$$ LANGUAGE plpgsql;
```

## ✅ Валидация

- `name` - обязательно, максимум 255 символов
- `inn` - опционально, уникальный, 10 или 12 цифр
- `kpp` - опционально, 9 цифр
- `category` - обязательно, из списка ExpenseCategory
- `rating` - опционально, от 1 до 5
- `discount_percent` - опционально, от 0 до 100
- `email` - опционально, валидный email format
- `is_active` - по умолчанию true
- `is_verified` - по умолчанию false
- `priority` - по умолчанию 0
