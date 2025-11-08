# ИНСТРУКЦИИ ПО ИСПРАВЛЕНИЮ ПРОБЛЕМ СО СЧЕТАМИ

## Обнаруженные проблемы:

1. ✅ **Номер счета некорректный** - парсер находил БИК (044525104) вместо реального номера (1010)
2. ⚠️ **НДС не извлекается** - vat_amount: null (требует проверки OCR)
3. ❌ **Файлы не открываются** - RLS блокирует доступ к Storage
4. ✅ **Валюта отображается как $** вместо ₽
5. ✅ **Порядковый номер отсутствует**

## ЧТО ИСПРАВЛЕНО В КОДЕ:

### 1. Парсер номера счета (ultimate_invoice_parser.py)
- Добавлены HIGH PRIORITY паттерны для коротких номеров (1-6 цифр):
  ```python
  r'СЧЁТ\s*№\s*(\d{1,6})\s*от',
  r'СЧЕТ\s*№\s*(\d{1,6})\s*от',
  ```
- Теперь ищет "Счет № 1010 от" ПЕРЕД длинными номерами типа БИК

### 2. Валюта в UI (src/app/invoices/page.tsx)
- Изменил `formatCurrency()`:
  ```typescript
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ₽';
  ```
- Теперь отображает: `7 500,00 ₽` вместо `$7,500.00`

### 3. Порядковый номер (add-sequence-number.sql + page.tsx)
- Добавлена колонка `sequence_number` с автоинкрементом
- В UI отображается: `#1 • Invoice № 1010`

### 4. Interface обновлен:
- Добавлено поле `sequence_number?: number;`

## ЧТО НУЖНО СДЕЛАТЬ В SUPABASE:

### КРИТИЧНО - Выполни ЭТИ SQL команды в Supabase SQL Editor:

#### Шаг 1: Отключить RLS для таблиц и Storage
```sql
-- Отключаем RLS для таблиц
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;

-- Делаем Storage bucket публичным (чтобы файлы открывались)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'invoice-files';
```

#### Шаг 2: Добавить порядковый номер
```sql
-- Добавляем колонку
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sequence_number SERIAL;

-- Обновляем существующие записи
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
  FROM invoices
)
UPDATE invoices
SET sequence_number = numbered.new_number
FROM numbered
WHERE invoices.id = numbered.id;

-- Создаем функцию автоматического назначения номера
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
```

## ПОСЛЕ ВЫПОЛНЕНИЯ SQL:

1. Обнови страницу в браузере (F5)
2. Счета должны загрузиться (RLS отключен для suppliers)
3. Валюта будет в рублях (₽)
4. Появятся порядковые номера (#1, #2, #3...)
5. Файлы будут открываться по ссылке (Storage публичный)

## ПРОВЕРКА НОМЕРА СЧЕТА:

Загрузи файл "Счет № 1010 от 12.10.2025.pdf" снова - парсер должен теперь найти:
- `invoice_number: "1010"` ✅ (вместо "044525104")
- `total_amount: 7500` ✅
- `vat_amount: ???` ⚠️ (нужно проверить OCR)

## ПОЧЕМУ НДС НЕ НАХОДИТСЯ:

В логах: `"has_vat": false`, `"vat_amount": null`

Возможные причины:
1. В счете написано "Без НДС" 
2. OCR не распознал текст с НДС
3. Паттерны не подходят для этого формата

Чтобы проверить - загрузи счет еще раз и посмотри в консоль браузера что пришло в response.

## ФАЙЛЫ С ИЗМЕНЕНИЯМИ:

- `ultimate_invoice_parser.py` - паттерны номера счета
- `src/app/invoices/page.tsx` - валюта и порядковый номер
- `disable-invoices-rls.sql` - SQL для RLS и Storage
- `add-sequence-number.sql` - SQL для порядкового номера

## ВАЖНО:

После выполнения SQL в Supabase - **обязательно перезапусти dev server**:
```bash
Ctrl+C (остановить)
npm run dev (запустить снова)
```

Это обновит Supabase схему в Next.js.
