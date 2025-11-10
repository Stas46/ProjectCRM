# 🧪 Инструкция для тестирования файлов

## Что реализовано

✅ **Полная поддержка файлов** - изображения + документы
✅ **Автоматический выбор API** - Chat Completions / Responses API
✅ **Files API интеграция** - загрузка PDF/DOCX в OpenAI
✅ **UI компоненты** - кнопка скрепки, превью файлов

## Шаг 1: Настройка базы данных

### 1.1 Создайте Storage bucket

Откройте Supabase Dashboard → SQL Editor и выполните:

```sql
-- create-storage-bucket.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

Проверьте: Supabase Dashboard → Storage → должен появиться bucket `chat-files`

### 1.2 Обновите схему БД

Выполните в SQL Editor:

```sql
-- chat-attachments-schema.sql

ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message_id ON chat_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_user_id ON chat_attachments(user_id);

ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments"
  ON chat_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attachments"
  ON chat_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON chat_attachments FOR DELETE
  USING (auth.uid() = user_id);
```

## Шаг 2: Запуск приложения

```bash
cd "c:\Users\Stas\Projects\CRM CLAUDE\glazing-crm"
npm run dev
```

Откройте: http://localhost:3000/chat

## Шаг 3: Тестирование изображений

1. Выберите модель **GPT-4o 🎨** (поддерживает Vision)
2. Нажмите кнопку скрепки 📎
3. Выберите изображение (JPG, PNG)
4. Напишите: "Что на изображении?"
5. Нажмите "Отправить"

**Ожидаемый результат**:
- Файл появился в превью
- Изображение отобразилось в сообщении
- AI описал содержимое изображения
- В консоли: `🔄 Using Chat Completions API`

## Шаг 4: Тестирование PDF документов

### Подготовка тестового PDF

Создайте простой PDF с текстом (можно через Word → Save as PDF):
```
Договор № 123
от 01.01.2025

Исполнитель обязуется выполнить работы до 31.12.2025.
Штраф за просрочку: 10% от суммы договора.
```

### Тестирование

1. Выберите модель **GPT-4o 🎨**
2. Нажмите кнопку скрепки 📎
3. Выберите PDF файл
4. Напишите: "Какой номер договора и дата?"
5. Нажмите "Отправить"

**Ожидаемый результат**:
- Файл появился в превью
- В консоли браузера (F12):
  ```
  📤 Uploading file to OpenAI: contract.pdf
  ✅ File uploaded to OpenAI: file-abc123xyz
  📎 Document attached: contract.pdf (file-abc123xyz)
  🔄 Using Responses API with file attachments
  ```
- AI прочитал документ и ответил: "Договор № 123 от 01.01.2025"

## Шаг 5: Тестирование DOCX

1. Создайте простой DOCX файл с текстом:
   ```
   Контакты:
   Email: support@company.com
   Телефон: +7 (495) 123-45-67
   ```

2. Прикрепите файл
3. Напишите: "Извлеки email и телефон"
4. Отправьте

**Ожидаемый результат**:
- AI вернул: "Email: support@company.com, Телефон: +7 (495) 123-45-67"

## Шаг 6: Смешанный запрос (изображение + PDF)

1. Прикрепите изображение
2. Прикрепите PDF
3. Напишите: "Проанализируй оба файла"
4. Отправьте

**Ожидаемый результат**:
- В консоли: `🔄 Using Responses API with file attachments`
- AI проанализировал оба файла

## Что проверить в консоли браузера (F12)

### При отправке изображения:
```
Sending message to API
🔄 Using Chat Completions API
```

### При отправке PDF/DOCX:
```
Sending message to API
📤 Uploading file to OpenAI: document.pdf
✅ File uploaded to OpenAI: file-abc123xyz
📎 Document attached: document.pdf (file-abc123xyz)
🔄 Using Responses API with file attachments
```

## Что проверить в консоли сервера (терминал npm run dev)

```
🔍 Auth token found: true
👤 User: your@email.com Error: null
📤 Uploading file to OpenAI: contract.pdf
✅ File uploaded to OpenAI: file-abc123xyz
🔄 Using Responses API with file attachments
```

## Возможные проблемы

### Ошибка: "Property 'responses' does not exist"

**Решение**: Обновите OpenAI SDK
```bash
npm install openai@latest
```

### Ошибка: 401 Unauthorized

**Решение**: Проверьте `.env.local`:
```
OPENAI_API_KEY=sk-proj-...
```

### Bucket not found

**Решение**: Выполните `create-storage-bucket.sql` в Supabase

### PDF не читается

**Проверьте**:
- Модель GPT-4o или GPT-4o-mini (другие не поддерживают)
- Размер файла < 50MB
- В консоли есть `file-abc123xyz`

## Если всё работает

✅ Изображения анализируются через Chat Completions
✅ Документы читаются через Responses + Files API
✅ Автоматический выбор API работает
✅ Файлы отображаются в UI
✅ Стоимость рассчитывается корректно

**Готово к использованию!** 🎉

## Следующие шаги

- Протестируйте с реальными документами (контракты, счета)
- Проверьте стоимость в статистике
- Попробуйте разные модели (GPT-4o vs GPT-4o-mini)
- Проверьте лимиты (50MB на файл)
