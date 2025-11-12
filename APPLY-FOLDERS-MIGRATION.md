# Применение миграции для создания таблицы project_folders

## Шаги

1. Открой Supabase Dashboard: https://supabase.com/dashboard/project/fpnugtlchxigwpqwiczc

2. Перейди в SQL Editor (слева в меню)

3. Скопируй и выполни SQL из файла `setup-project-folders.sql`

4. Проверь создание таблицы:
```sql
SELECT * FROM project_folders;
```

Должна вернуться пустая таблица (0 rows).

## Что делает миграция

- Создает таблицу `project_folders` для хранения пустых папок
- Поля:
  - `id` - UUID первичный ключ
  - `project_id` - ссылка на проект
  - `folder_path` - полный путь к папке
  - `folder_name` - название папки
  - `parent_folder` - родительская папка (опционально)
  - `created_at`, `updated_at` - временные метки
- Создает индексы для быстрого поиска
- Настраивает RLS политики
- Добавляет триггер для auto-update `updated_at`

После применения миграции пустые папки будут сохраняться в базе данных.
