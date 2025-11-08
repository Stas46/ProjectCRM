# 🚀 Инструкция по развертыванию

## Шаг 1: База данных

### 1.1 Создание схемы в Supabase

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое файла `database/schema.sql`
3. Выполните SQL скрипт
4. Проверьте создание таблиц: `suppliers`, `invoices`
5. Проверьте создание представлений: `invoices_with_suppliers`, `supplier_totals`

### 1.2 Создание Storage bucket

1. Откройте Supabase Dashboard → Storage
2. Создайте новый bucket с именем `invoices`
3. Настройки bucket:
   - **Public**: `true` (для доступа к файлам)
   - **File size limit**: `50 MB` (для PDF файлов)
   - **Allowed MIME types**: `application/pdf`, `image/*`

### 1.3 Политики безопасности (опционально)

Если нужна авторизация, раскомментируйте секцию RLS в `schema.sql` и создайте политики.

---

## Шаг 2: Переменные окружения

Создайте файл `.env.local` в корне проекта:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Cloud Vision API
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

### Получение ключей Supabase:
1. Supabase Dashboard → Settings → API
2. Скопируйте `URL`, `anon key`, `service_role key`

### Настройка Google Cloud Vision:
1. Создайте проект в Google Cloud Console
2. Включите Vision API
3. Создайте Service Account и скачайте JSON ключ
4. Сохраните как `google-credentials.json` в корне проекта

---

## Шаг 3: Установка файлов в проект

### 3.1 TypeScript типы

Скопируйте файлы из `types/` в ваш проект:

```bash
# Создайте директорию (если нет)
mkdir -p src/types

# Скопируйте типы
cp invoice-system-clean/types/invoice.ts src/types/
cp invoice-system-clean/types/supplier.ts src/types/
```

### 3.2 API Endpoint

Скопируйте API endpoint:

```bash
# Создайте директорию
mkdir -p src/app/api/smart-invoice

# Скопируйте endpoint
cp invoice-system-clean/api/smart-invoice.ts src/app/api/smart-invoice/route.ts
```

### 3.3 Python парсер

Python скрипт `ultimate_invoice_parser.py` уже должен быть в корне проекта.

---

## Шаг 4: Установка зависимостей

```bash
# Node.js пакеты
npm install @google-cloud/vision @supabase/supabase-js

# Python пакеты
pip install google-cloud-vision
```

---

## Шаг 5: Проверка работы

### 5.1 Тест API

Создайте тестовый файл `test-upload.html`:

```html
<!DOCTYPE html>
<html>
<body>
  <input type="file" id="file" accept=".pdf,image/*">
  <button onclick="upload()">Загрузить</button>
  <pre id="result"></pre>

  <script>
    async function upload() {
      const file = document.getElementById('file').files[0];
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/smart-invoice', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      document.getElementById('result').textContent = JSON.stringify(data, null, 2);
    }
  </script>
</body>
</html>
```

### 5.2 Запустите сервер

```bash
npm run dev
```

### 5.3 Откройте тест

```
http://localhost:3000/test-upload.html
```

### 5.4 Загрузите тестовый счет

- Выберите PDF или изображение счета
- Нажмите "Загрузить"
- Проверьте результат в консоли и в таблице `invoices`

---

## ✅ Готово!

Система распознавания счетов готова к работе. Можете удалить все остальные файлы старого проекта.

---

## 📝 Примечания

### Формат ответа API

```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoice_number": "УТ-784",
    "invoice_date": "2025-11-08",
    "total_amount": 15000.00,
    "vat_amount": 2500.00,
    "supplier_id": "uuid",
    "file_url": "https://...",
    "created_at": "2025-11-08T10:00:00Z"
  },
  "parsed": {
    "invoice_number": "УТ-784",
    "invoice_date": "2025-11-08",
    "total_amount": 15000.00,
    "vat_amount": 2500.00,
    "supplier_name": "ООО Компания",
    "supplier_inn": "1234567890"
  }
}
```

### Просмотр данных

Используйте SQL запросы в Supabase SQL Editor:

```sql
-- Все счета с поставщиками
SELECT * FROM invoices_with_suppliers;

-- Суммы по поставщикам
SELECT * FROM supplier_totals ORDER BY total_amount DESC;

-- Последние 10 счетов
SELECT * FROM invoices ORDER BY created_at DESC LIMIT 10;
```
