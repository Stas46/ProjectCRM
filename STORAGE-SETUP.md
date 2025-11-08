# Настройка Supabase Storage для счетов

## Шаг 1: Создайте Bucket в Supabase

1. Откройте **https://supabase.com**
2. Выберите ваш проект
3. Перейдите в раздел **Storage** (слева в меню)
4. Нажмите кнопку **New bucket**
5. Введите имя: `invoices`
6. Установите настройки:
   - **Public bucket**: ✅ (галочка включена)
   - Это позволит получать прямые ссылки на файлы
7. Нажмите **Create bucket**

## Шаг 2: Проверьте настройки

После создания bucket:
- Bucket `invoices` должен появиться в списке
- Можно загружать файлы (PDF, PNG, JPG)

## Шаг 3: Перезапустите загрузку

После создания bucket:
1. Откройте http://localhost:3000/invoices
2. Загрузите счёт заново
3. Файл должен успешно загрузиться

## Альтернатива: Создать bucket через SQL

Если у вас есть доступ к SQL Editor в Supabase, выполните:

```sql
-- Создаём bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true);
```

## Готово!

Теперь система будет сохранять загруженные счета в Supabase Storage.
