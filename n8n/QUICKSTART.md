# Быстрая настройка n8n Email агента

## 🚀 Шаг 1: Импорт готового workflow

1. Откройте https://n8n.alu.stella-spb.ru
2. Войдите: `admin` / `!@124880Vkt`
3. Нажмите **"+"** → **"Import from file"**
4. Выберите файл: `/n8n/workflows/invoice-email-notification.json`
5. Workflow импортирован!

## 📧 Шаг 2: Настройка Яндекс.Почты (SMTP)

### 2.1 Используйте существующие настройки SMTP

У вас уже настроена корпоративная почта `info@stella-spb.ru` на Яндексе.

### 2.2 Добавьте SMTP credentials в n8n

1. В n8n откройте **Settings** (шестеренка) → **Credentials**
2. Нажмите **"Add credential"**
3. Выберите **"SMTP"**
4. Заполните:
   - **Name**: `Yandex SMTP`
   - **Host**: `smtp.yandex.ru`
   - **Port**: `465`
   - **SSL/TLS**: `Yes`
   - **User**: `info@stella-spb.ru`
   - **Password**: `[пароль от info@stella-spb.ru]`
5. Нажмите **"Create"**

> 💡 **Совет**: Если не знаете пароль от `info@stella-spb.ru`, создайте пароль приложения на https://id.yandex.ru/security/app-passwords

### 2.3 Привяжите credentials к workflow

1. Откройте импортированный workflow
2. Кликните на ноду **"Send Email via Yandex"**
3. В поле **Credential to connect with** выберите `Yandex SMTP`
4. Сохраните

## ✅ Шаг 3: Активируйте workflow

1. В правом верхнем углу включите toggle **"Active"** (станет зеленым)
2. Скопируйте **Production URL**:
   ```
   https://n8n.alu.stella-spb.ru/webhook/invoice-created
   ```

## 🔧 Шаг 4: Настройте email получателя

Измените email получателя в ноде "Prepare Email Data":

1. Кликните на ноду **"Prepare Email Data"**
2. Найдите поле `to`
3. Измените `admin@stella-spb.ru` на нужный email
4. Сохраните workflow

Для отправки нескольким получателям:
```
admin@stella-spb.ru, manager@stella-spb.ru
```

## 🧪 Тестирование

### Тест 1: Через curl

```bash
curl -X POST https://n8n.alu.stella-spb.ru/webhook/invoice-created \
  -H "Content-Type: application/json" \
  -d '{
    "type": "invoice_created",
    "invoice": {
      "id": "test-123",
      "number": "777",
      "date": "2025-11-12",
      "total_amount": 15000,
      "supplier_name": "ООО Тестовая компания",
      "supplier_inn": "1234567890"
    },
    "project_id": "test-project",
    "timestamp": "2025-11-12T10:00:00.000Z"
  }'
```

### Тест 2: Загрузите реальный счет в CRM

1. Откройте https://alu.stella-spb.ru
2. Загрузите любой PDF/Excel счет
3. Проверьте почту - должно прийти уведомление!

## 📊 Проверка логов

В n8n:
1. Перейдите во вкладку **"Executions"** (левое меню)
2. Смотрите историю выполнений
3. Кликните на любое выполнение чтобы увидеть детали

## ⚙️ Дополнительные настройки

### Изменить тему письма

В ноде "Prepare Email Data" → поле `subject`:
```
=📄 Счет №{{$json.invoice.number}} | {{$json.invoice.supplier_name}} | {{$json.invoice.total_amount}}₽
```

### Добавить Telegram уведомления

1. Добавьте ноду **"Telegram"** после "Send Email via Yandex"
2. Укажите Bot Token и Chat ID
3. Сообщение:
```
=🔔 Новый счет!
📄 №{{$json.invoice.number}}
🏢 {{$json.invoice.supplier_name}}
💰 {{$json.invoice.total_amount}} ₽
📅 {{$json.invoice.date}}
```

### Сохранить логи в Supabase

1. Добавьте ноду **"HTTP Request"**
2. Method: `POST`
3. URL: `https://fpnugtlchxigwpqwiczc.supabase.co/rest/v1/email_logs`
4. Headers:
   ```
   apikey: [ВАШ_SUPABASE_ANON_KEY]
   Authorization: Bearer [ВАШ_SUPABASE_SERVICE_ROLE_KEY]
   Content-Type: application/json
   ```
5. Body:
   ```json
   {
     "invoice_id": "={{$json.invoice.id}}",
     "recipient": "={{$json.to}}",
     "subject": "={{$json.subject}}",
     "sent_at": "={{$now}}",
     "status": "sent"
   }
   ```

## 🔒 Безопасность (опционально)

Добавьте Basic Auth для webhook:

1. В ноде "Invoice Created Webhook" включите **Authentication: Basic Auth**
2. Создайте новый credential "HTTP Basic Auth":
   - Username: `crm`
   - Password: `[сложный_пароль]`
3. Обновите на сервере `.env.local`:
   ```bash
   N8N_WEBHOOK_URL=https://crm:[пароль]@n8n.alu.stella-spb.ru/webhook/invoice-created
   ```

## 🆘 Troubleshooting

### Email не отправляется

1. Проверьте SMTP credentials
2. Убедитесь что workflow **Active**
3. Проверьте пароль приложения Яндекс
4. Посмотрите логи в Executions

### Webhook не срабатывает

1. Проверьте что workflow Active
2. Проверьте URL webhook в .env.local
3. Посмотрите логи CRM: `ssh root@82.97.253.12 "pm2 logs crm-glazing"`

### Письма в спаме

1. Используйте `info@stella-spb.ru` вместо noreply (улучшает доставляемость)
2. SPF и DKIM уже настроены для stella-spb.ru
3. Если нужно, добавьте записи для поддомена (см. docs/dns-setup.md)

### Лимиты отправки

Рекомендуется придерживаться лимитов:
- **Максимум**: 100 писем в час
- **Интервал**: 30 секунд между письмами
- Избегайте массовых рассылок

## 📚 Документация

Полная документация: `/docs/n8n-email-setup.md`
