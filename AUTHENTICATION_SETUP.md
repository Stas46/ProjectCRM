# Настройка аутентификации - Пошаговая инструкция

## Шаг 1: Выполните SQL миграцию

1. Откройте Supabase Dashboard вашего проекта
2. Перейдите в SQL Editor
3. Скопируйте содержимое файла `setup-authentication.sql`
4. Выполните SQL скрипт

## Шаг 2: Включите Email Authentication

1. В Supabase Dashboard откройте **Authentication** → **Providers**
2. Найдите **Email** provider
3. Включите его (Enable)
4. Сохраните изменения

## Шаг 3: Создайте первого администратора

### Вариант А: Через Supabase Dashboard (рекомендуется)

1. Откройте **Authentication** → **Users**
2. Нажмите **Add User** → **Create new user**
3. Введите email и пароль для админа
4. Нажмите **Create User**
5. Скопируйте ID созданного пользователя
6. Перейдите в **SQL Editor** и выполните:

```sql
-- Обновите роль пользователя на admin
UPDATE profiles 
SET role = 'admin', full_name = 'Администратор'
WHERE id = 'ВСТАВЬТЕ_ID_ПОЛЬЗОВАТЕЛЯ_СЮДА';
```

### Вариант Б: Через SQL (если профиль не создался автоматически)

```sql
-- Найдите ID пользователя
SELECT id, email FROM auth.users WHERE email = 'ваш-email@example.com';

-- Создайте профиль с ролью admin
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'ID_ПОЛЬЗОВАТЕЛЯ',
  'ваш-email@example.com',
  'Администратор',
  'admin'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin';
```

## Шаг 4: Выполните миграцию для поля archived

```sql
-- Из файла add-archived-field.sql
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);
```

## Шаг 5: Проверьте настройки

1. Выйдите из приложения (если были залогинены)
2. Перейдите на `/login`
3. Войдите с созданными учетными данными администратора
4. После входа проверьте:
   - Доступ к админ-панели `/admin/users`
   - Создание задач в Inbox (должны быть привязаны к вашему ID)

## Структура базы данных

### Таблица `profiles`
- `id` - UUID (связь с auth.users)
- `email` - Email пользователя
- `full_name` - Полное имя
- `role` - Роль ('admin' или 'user')

### Обновленная таблица `tasks`
- `assignee_id` - ID пользователя для личных задач (Inbox)
- `archived` - Флаг архивной задачи

## Политики доступа (RLS)

### Tasks:
- Задачи с `project_id` видны всем авторизованным
- Задачи Inbox (`project_id = null`) видны только владельцу (`assignee_id`)

### Profiles:
- Админы видят всех пользователей
- Обычные пользователи видят только свой профиль
- Только админы могут создавать/удалять пользователей

## Тестирование

1. **Вход под админом** - должен видеть все проекты и задачи
2. **Создание обычного пользователя** - через админ-панель
3. **Вход под обычным пользователем** - видит только свой Inbox
4. **Создание задачи в Inbox** - автоматически assignee_id = current user
5. **Создание задачи в проекте** - видна всем пользователям

## Шаг 5: Настройте переменные окружения

1. Создайте файл `.env.local` в корне проекта (если его нет)
2. Добавьте туда ваши Supabase ключи:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Где найти ключи:**
1. Откройте Supabase Dashboard
2. Перейдите в **Settings** → **API**
3. Скопируйте:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** ключ → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** ключ → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Секретный!

⚠️ **ВАЖНО:** Service role key дает полный доступ к базе! Храните его в секрете.

## Шаг 6: Перезапустите сервер разработки

```bash
npm run dev
```

## Шаг 7: Протестируйте систему

1. Откройте http://localhost:3000
2. Вы будете перенаправлены на `/login`
3. Войдите с учетными данными администратора
4. Проверьте доступ к админ-панели (кнопка "Админ" в шапке)
5. Перейдите в `/admin/users`
6. Создайте тестового пользователя через форму

### Тестирование RLS политик

1. Создайте обычного пользователя (не admin) через админ-панель
2. Выйдите из учетной записи админа (кнопка "Выход")
3. Войдите как обычный пользователь
4. Попробуйте открыть `/admin/users` - должен быть редирект на главную
5. Создайте задачу в Inbox - она должна быть видна только вам
6. Создайте задачу в проекте - она будет видна всем

## Troubleshooting

Если после создания пользователя профиль не появился:
```sql
-- Проверьте триггер
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Если нет - создайте вручную:
-- (смотрите setup-authentication.sql, секция 4)
```

Если RLS блокирует доступ:
```sql
-- Проверьте политики
SELECT * FROM pg_policies WHERE tablename IN ('tasks', 'profiles');

-- Временно отключите RLS для отладки (НЕ для продакшена!)
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```
