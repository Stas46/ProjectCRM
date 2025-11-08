# ✅ Файлы перенесены в backup

## Папки базы данных
- ✅ database/
- ✅ database-schema/
- ✅ supabase/
- ✅ sql/

## SQL файлы (старые)
- ✅ check-invoices-projects.sql
- ✅ cloud-schema-complete.sql
- ✅ fix-invoices-rls.sql
- ✅ fix-projects-rls.sql
- ✅ fix-schema-permissions.sql
- ✅ reset-schema-cache.sql

**Оставлены:**
- ✅ CREATE-CLEAN-SCHEMA.sql
- ✅ RESET-SCHEMA.sql

## Тестовые JS файлы
- ✅ check-columns.js
- ✅ check-suppliers.js

## TypeScript типы (старые)
- ✅ client.ts
- ✅ employee.ts
- ✅ message.ts
- ✅ project.ts
- ✅ shift.ts
- ✅ task.ts

**Оставлены (обновлены):**
- ✅ invoice.ts (новая версия)
- ✅ supplier.ts (новая версия с экспортами для совместимости)
- ✅ next-pwa.d.ts

## Страницы (старые)
- ✅ projects/
- ✅ tasks/
- ✅ employees/
- ✅ chats/
- ✅ calendar/
- ✅ alternative-convert/
- ✅ api-test/
- ✅ convert/
- ✅ ocr/
- ✅ parser-test/
- ✅ pdf-analyze/
- ✅ pdf-info/
- ✅ pdf-text-image/
- ✅ pdf-tools/
- ✅ raw-invoice-recognition/
- ✅ simple-convert/
- ✅ test/
- ✅ test-center/
- ✅ test-invoice-recognition/
- ✅ test-vision-api/
- ✅ seed/

**Оставлены:**
- ✅ invoices/
- ✅ suppliers/
- ✅ login/
- ✅ profile/

## API endpoints (старые)
- ✅ create-test-project/
- ✅ invoice-ocr/
- ✅ invoices/
- ✅ pdf-convert/
- ✅ pdf-info/
- ✅ pdf-ocr/
- ✅ pdf-simple/
- ✅ pdf-text/
- ✅ pdf-text-image/
- ✅ pdf-to-image/
- ✅ pdf-to-png/
- ✅ projects/
- ✅ real-pdf/
- ✅ recognize-invoice/
- ✅ retrain-model/
- ✅ save-parser-rules/
- ✅ save-training-data/
- ✅ test/
- ✅ test-parser/
- ✅ test-vision-api/

**Оставлены:**
- ✅ smart-invoice/ (обновлен)
- ✅ files/
- ✅ suppliers/

## Компоненты (старые)
- ✅ project-card.tsx
- ✅ project-filters.tsx
- ✅ task-card.tsx
- ✅ task-filters.tsx
- ✅ google-cloud-api-tester.tsx
- ✅ PDFOCRTest.tsx
- ✅ PyMuPDFConverter.tsx

**Оставлены:**
- ✅ app-layout.tsx
- ✅ expense-progress-bar.tsx
- ✅ invoice-card.tsx
- ✅ invoice-edit-dialog.tsx
- ✅ invoice-edit.tsx
- ✅ invoice-filters.tsx
- ✅ invoice-recognition.tsx
- ✅ invoice-upload-recognizer.tsx
- ✅ mobile-nav.tsx
- ✅ side-nav.tsx
- ✅ simple-invoice-upload-old.tsx
- ✅ simple-invoice-upload.tsx
- ✅ SmartInvoiceAnalyzer.tsx
- ✅ ui/ (компоненты shadcn/ui)

## Сервисы (старые)
- ✅ employees.ts
- ✅ messages.ts
- ✅ projects.ts
- ✅ shifts.ts
- ✅ task-attachments.ts
- ✅ tasks.ts

**Оставлены:**
- ✅ files.ts
- ✅ invoice-files.ts
- ✅ invoice-recognition.ts
- ✅ invoices.ts
- ✅ suppliers.ts

---

## 📊 Статистика

**Перенесено в backup:**
- Папок БД: 4
- SQL файлов: 6
- JS тестов: 2
- Старых типов: 6
- Страниц: 25
- API endpoints: 20
- Компонентов: 7
- Сервисов: 6

**Итого: ~76 файлов/папок**

**Оставлено для работы:**
- SQL: 2 (CREATE-CLEAN-SCHEMA.sql, RESET-SCHEMA.sql)
- Типы: 3 (invoice.ts, supplier.ts, next-pwa.d.ts)
- Страницы: 4 (invoices, suppliers, login, profile)
- API: 3 (smart-invoice, files, suppliers)
- Компоненты: ~14 (для счетов и UI)
- Сервисы: 5 (для счетов и файлов)

---

## 🎯 Система готова к тестированию

Все старые файлы сохранены в `backup/` и могут быть восстановлены при необходимости.

Текущая система включает только:
- ✅ Распознавание счетов
- ✅ Управление поставщиками
- ✅ Хранение файлов
- ✅ База данных (suppliers, invoices)
