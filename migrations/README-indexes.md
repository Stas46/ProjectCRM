# Миграция индексов для ускорения работы

## Что делает эта миграция

Добавляет индексы в базу данных для ускорения частых запросов в **10-100 раз**.

## Как применить

### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. Откройте https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Скопируйте содержимое файла `001-performance-indexes.sql`
5. Вставьте в редактор и нажмите **Run**

### Вариант 2: Через psql (если есть доступ)

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" -f migrations/001-performance-indexes.sql
```

## Какие запросы ускорятся

### chat_messages
- Загрузка последних сообщений по типу агента
- Фильтрация сообщений пользователя
- Комбинированные запросы

### projects
- Список проектов по статусу
- Сортировка по дате
- Поиск активных проектов с дедлайном
- Фильтрация по клиенту

### invoices
- Список неоплаченных счетов
- Сортировка по дате
- Поиск по поставщику
- Подсчёт сумм

### tasks
- Поиск задач по статусу и приоритету
- Задачи проекта
- Задачи исполнителя
- Просроченные задачи

## Размер индексов

Индексы займут примерно 10-50 MB дискового пространства (зависит от объёма данных).

## Проверка работы

После применения миграции выполните:

```sql
-- Проверить созданные индексы
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Проверить использование индексов
EXPLAIN ANALYZE 
SELECT * FROM chat_messages 
WHERE agent_type = 'general' 
ORDER BY created_at DESC 
LIMIT 50;
```

В плане выполнения должны появиться строки вида:
```
Index Scan using idx_chat_messages_agent_created
```

## Откат (если нужно)

```sql
-- Удалить все созданные индексы
DROP INDEX IF EXISTS idx_chat_messages_agent_created;
DROP INDEX IF EXISTS idx_chat_messages_user_created;
DROP INDEX IF EXISTS idx_chat_messages_composite;
-- ... и так далее для всех индексов
```
