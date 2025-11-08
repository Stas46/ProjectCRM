# 🔧 Исправление ошибки миграции

## Проблема
При выполнении test-data.sql получены ошибки:
1. `ERROR: column "first_name" of relation "clients" does not exist`
2. `ERROR: null value in column "name" of relation "employees" violates not-null constraint`

## Причина
Была несогласованность между документацией и SQL скриптами:
- **clients**: Документация использовала `first_name`, `last_name`, SQL использовал `name`
- **employees**: SQL имел и `name` (NOT NULL) и `first_name`, `last_name` одновременно
- **projects**: Документация использовала `name`, `end_date`, SQL использовал `title`, `due_date`

## ✅ Решение (уже исправлено)

SQL файлы обновлены:

### complete-schema-part1.sql
- ✅ `clients`: изменено `name` → `first_name`, `last_name`, `middle_name`
- ✅ `clients`: изменено `description` → `notes`
- ✅ `clients`: удалено `is_active` (не используется)
- ✅ `clients`: добавлено `additional_phones`, `additional_emails`, `documents`
- ✅ `projects`: изменено `title` → `name`
- ✅ `projects`: изменено `due_date` → `end_date`
- ✅ `projects`: изменено статус `active` → `in_progress`, `done` → `completed`
- ✅ `projects`: удалено устаревшее поле `client` (TEXT)

## 🚀 Как применить исправления

### Вариант 1: Полный сброс (рекомендуется)

В Supabase SQL Editor выполните:

```sql
-- Удаляем всю схему и создаем заново
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Включаем расширение uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Затем выполните по порядку:
1. `complete-schema-part1.sql`
2. `complete-schema-part2.sql`
3. `test-data.sql` (опционально)

### Вариант 2: Пересоздать только clients и projects

```sql
-- Удаляем существующие таблицы
DROP TABLE IF EXISTS 
  message_attachments, project_messages, 
  shift_assignees, shifts,
  crew_members, crews, 
  task_attachments, task_comments,
  custom_expense_categories, 
  tasks, invoices, 
  projects, suppliers,
  employees, clients
CASCADE;
```

Затем выполните оба SQL файла заново.

## 🧪 Проверка после исправления

```bash
node verify-database.js
```

Должно показать:
```
✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!
```

## 📊 Что изменилось в схеме

### clients
```sql
-- СТАРОЕ (неправильно):
name VARCHAR(255) NOT NULL,
description TEXT,
is_active BOOLEAN

-- НОВОЕ (правильно):
first_name VARCHAR(100),
last_name VARCHAR(100),
middle_name VARCHAR(100),
notes TEXT,
additional_phones TEXT[],
additional_emails TEXT[],
documents JSONB
```

### projects
```sql
-- СТАРОЕ (неправильно):
title VARCHAR(255) NOT NULL,
due_date DATE,
status: 'planning' | 'active' | 'on_hold' | 'done' | 'cancelled'

-- НОВОЕ (правильно):
name VARCHAR(255) NOT NULL,
end_date DATE,
status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
```

## ✅ Готово!

Теперь все поля совпадают между:
- ✅ SQL схемой
- ✅ TypeScript типами
- ✅ Документацией
- ✅ Тестовыми данными

### employees
```sql
-- СТАРОЕ (неправильно):
name VARCHAR(255) NOT NULL, -- обязательное поле
first_name VARCHAR(100),
last_name VARCHAR(100),
middle_name VARCHAR(100)

-- НОВОЕ (правильно):
first_name VARCHAR(100) NOT NULL,
last_name VARCHAR(100) NOT NULL,
middle_name VARCHAR(100)
-- поле name удалено
```

---

**Дата исправления:** 12 октября 2025  
**Версия:** 2.0.2
