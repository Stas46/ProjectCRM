# 🚀 Быстрый старт: Чистая система распознавания счетов

## 📋 Что нужно сделать

### 1️⃣ Очистить базу данных в Supabase (5 минут)

1. Откройте [Supabase Dashboard](https://app.supabase.com) → SQL Editor
2. Выполните файл **`RESET-SCHEMA.sql`** (удалит все старые таблицы)
3. Выполните файл **`CREATE-CLEAN-SCHEMA.sql`** (создаст новые таблицы)
4. Storage → Создайте bucket **`invoices`** (Public)

**Подробная инструкция:** `DATABASE-SETUP-INSTRUCTIONS.md`

---

### 2️⃣ Скопировать файлы системы (2 минуты)

```bash
# Типы
copy invoice-system-clean\types\*.ts src\types\

# API
copy invoice-system-clean\api\smart-invoice.ts src\app\api\smart-invoice\route.ts
```

---

### 3️⃣ Настроить переменные окружения (1 минута)

`.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

---

### 4️⃣ Запустить и протестировать (1 минута)

```bash
npm run dev
```

Загрузите тестовый счет и проверьте таблицу `invoices` в Supabase.

---

## 📚 Документация

| Файл | Описание |
|------|----------|
| **DATABASE-SETUP-INSTRUCTIONS.md** | Пошаговая очистка и создание БД |
| **RESET-SCHEMA.sql** | Удаление старых таблиц |
| **CREATE-CLEAN-SCHEMA.sql** | Создание новой схемы |
| **invoice-system-clean/** | Вся новая система |

---

## ✅ Что получится

**Таблицы:**
- `suppliers` - Поставщики (name, inn, phone, email, legal_address, category)
- `invoices` - Счета (invoice_number, invoice_date, total_amount, vat_amount, supplier_id, **project_id**, file_url)

**Представления:**
- `invoices_with_suppliers` - Счета с данными поставщика
- `supplier_totals` - Суммы по поставщикам

**Возможности:**
- ✅ Загрузка PDF/изображений счетов
- ✅ Автоматическое распознавание OCR
- ✅ Извлечение: номер, дата, сумма, НДС, поставщик
- ✅ Хранение файлов в Storage
- ✅ Готовность к привязке к проектам (поле `project_id`)

---

## 🔄 Что изменилось

### ✅ Добавлено в счета
- `project_id` - Поле для будущей привязки к проектам (без FK, чтобы не блокировать работу)

### ❌ Удалено из старой версии
- Все лишние поля (contract_number, payment_date, ocr_raw_text, payment_status и т.д.)
- Таблицы: projects, clients, tasks, employees, crews, shifts, messages
- Сложные связи и зависимости

---

## 📊 Структура БД

```
suppliers
├── id
├── name *
├── inn
├── phone
├── email
├── legal_address
├── category
└── timestamps

invoices
├── id
├── supplier_id → suppliers.id
├── project_id (будущая связь)
├── invoice_number *
├── invoice_date *
├── total_amount *
├── vat_amount
├── file_url *
└── timestamps
```

---

## 🆘 Помощь

**Проблемы с БД?** → `DATABASE-SETUP-INSTRUCTIONS.md`

**Детали системы?** → `invoice-system-clean/README.md`

**Схема БД?** → `invoice-system-clean/DATABASE_DIAGRAM.md`
