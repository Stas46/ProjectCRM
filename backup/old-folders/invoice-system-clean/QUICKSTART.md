# ⚡ Быстрый старт

## 1️⃣ База данных (2 минуты)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. SQL Editor → **Скопируйте и выполните** `database/schema.sql`
3. Storage → Создайте bucket **`invoices`** (Public)

## 2️⃣ Файлы (1 минута)

```bash
# Скопируйте типы
copy invoice-system-clean\types\*.ts src\types\

# Скопируйте API
copy invoice-system-clean\api\smart-invoice.ts src\app\api\smart-invoice\route.ts
```

## 3️⃣ Переменные окружения (1 минута)

`.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

## 4️⃣ Тест (1 минута)

```bash
npm run dev
```

Откройте тестовую страницу и загрузите счет:
```
http://localhost:3000/test-upload.html
```

## ✅ Готово!

Проверьте таблицу `invoices` в Supabase - там должен появиться распознанный счет.

---

## 📊 Проверка данных

```sql
-- Все счета с поставщиками
SELECT * FROM invoices_with_suppliers;

-- Суммы по поставщикам
SELECT * FROM supplier_totals;
```

---

Подробная инструкция: `DEPLOYMENT.md`
