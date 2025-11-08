# 📊 Схема базы данных

## Диаграмма таблиц

```
┌─────────────────────────────────────┐
│           SUPPLIERS                 │
│─────────────────────────────────────│
│ 🔑 id (UUID)                        │
│ 📝 name (text) *required            │
│ 🏢 inn (text)                       │
│ 📞 phone (text)                     │
│ 📧 email (text)                     │
│ 📍 legal_address (text)             │
│ 🏷️  category (text)                 │
│ 📅 created_at (timestamp)           │
│ 📅 updated_at (timestamp)           │
└─────────────────────────────────────┘
           ↑
           │
           │ supplier_id (FK)
           │
┌──────────┴──────────────────────────┐
│           INVOICES                  │
│─────────────────────────────────────│
│ 🔑 id (UUID)                        │
│ 🔗 supplier_id (UUID FK)            │
│ � project_id (UUID) - будущая связь│
│ �🔢 invoice_number (text) *required  │
│ 📅 invoice_date (date) *required    │
│ 💰 total_amount (decimal) *required │
│ 🧾 vat_amount (decimal)             │
│ 📎 file_url (text) *required        │
│ 📅 created_at (timestamp)           │
│ 📅 updated_at (timestamp)           │
└─────────────────────────────────────┘
```

---

## Представления (Views)

### 1️⃣ invoices_with_suppliers

Объединяет счета с данными поставщика:

```sql
SELECT 
  i.id,
  i.invoice_number,
  i.invoice_date,
  i.total_amount,
  i.vat_amount,
  i.file_url,
  i.created_at,
  s.id as supplier_id,
  s.name as supplier_name,
  s.inn as supplier_inn,
  s.category as supplier_category
FROM invoices i
LEFT JOIN suppliers s ON i.supplier_id = s.id
ORDER BY i.created_at DESC;
```

**Использование:**
```typescript
const { data } = await supabase
  .from('invoices_with_suppliers')
  .select('*')
  .order('created_at', { ascending: false });
```

### 2️⃣ supplier_totals

Суммы счетов по каждому поставщику:

```sql
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
```

**Использование:**
```typescript
const { data } = await supabase
  .from('supplier_totals')
  .select('*')
  .order('total_amount', { ascending: false });
```

---

## Индексы

### suppliers
- `idx_suppliers_inn` - поиск по ИНН
- `idx_suppliers_name` - поиск по названию
- `idx_suppliers_category` - фильтр по категории

### invoices
- `idx_invoices_supplier_id` - JOIN с suppliers
- `idx_invoices_project_id` - JOIN с projects (будущая связь)
- `idx_invoices_invoice_number` - поиск по номеру
- `idx_invoices_invoice_date` - фильтр по дате
- `idx_invoices_created_at` - сортировка по времени создания

---

## Триггеры

### update_updated_at_column()

Автоматически обновляет `updated_at` при изменении записи:

```sql
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Категории поставщиков

Рекомендуемые значения для `suppliers.category`:

- `construction` - Строительство
- `materials` - Материалы
- `services` - Услуги
- `equipment` - Оборудование
- `transport` - Транспорт
- `other` - Прочее

TypeScript enum:
```typescript
export type SupplierCategory = 
  | 'construction'
  | 'materials'
  | 'services'
  | 'equipment'
  | 'transport'
  | 'other';
```

---

## Примеры запросов

### Все счета за текущий месяц
```sql
SELECT * FROM invoices_with_suppliers
WHERE invoice_date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY invoice_date DESC;
```

### Топ-5 поставщиков по сумме
```sql
SELECT * FROM supplier_totals
ORDER BY total_amount DESC
LIMIT 5;
```

### Счета без НДС
```sql
SELECT * FROM invoices
WHERE vat_amount IS NULL OR vat_amount = 0;
```

### Поставщики без счетов
```sql
SELECT * FROM supplier_totals
WHERE invoice_count = 0;
```

### Общая сумма по категориям
```sql
SELECT 
  s.category,
  COUNT(DISTINCT s.id) as supplier_count,
  COUNT(i.id) as invoice_count,
  COALESCE(SUM(i.total_amount), 0) as total
FROM suppliers s
LEFT JOIN invoices i ON i.supplier_id = s.id
GROUP BY s.category
ORDER BY total DESC;
```

---

## Storage структура

```
invoices/
  ├── {timestamp}-{random}.pdf
  ├── {timestamp}-{random}.jpg
  └── {timestamp}-{random}.png
```

Формат имени файла:
```
1699445678901-a3f2d9.pdf
└─────┬──────┘ └─┬─┘
   timestamp    random
```

---

## Размеры данных

### Примерная оценка:

| Таблица    | Запись | 1,000 записей | 10,000 записей |
|------------|--------|---------------|----------------|
| suppliers  | ~500B  | ~500 KB       | ~5 MB          |
| invoices   | ~300B  | ~300 KB       | ~3 MB          |

**Storage:** 1 счет (PDF) ≈ 100-500 KB

1,000 счетов ≈ 100-500 MB

---

## Миграции (будущее расширение)

Если потребуется добавить новые поля:

```sql
-- Добавить статус оплаты
ALTER TABLE invoices 
ADD COLUMN payment_status TEXT DEFAULT 'pending';

-- Связь с проектами УЖЕ ДОБАВЛЕНА (project_id)
-- Когда создадите таблицу projects, добавьте FK:
-- ALTER TABLE invoices 
-- ADD CONSTRAINT fk_project 
-- FOREIGN KEY (project_id) REFERENCES projects(id);

-- Добавить примечания
ALTER TABLE suppliers 
ADD COLUMN notes TEXT;
```
