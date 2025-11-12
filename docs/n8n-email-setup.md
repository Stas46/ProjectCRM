# Настройка n8n для отправки email из CRM

## Шаг 1: Создание workflow в n8n

1. Откройте https://n8n.alu.stella-spb.ru
2. Войдите (admin / !@124880Vkt)
3. Нажмите **"Create new workflow"**

## Шаг 2: Настройка Webhook (входная точка)

1. Добавьте ноду **"Webhook"**
   - HTTP Method: `POST`
   - Path: `send-email`
   - Authentication: `None` (или `Basic Auth` для безопасности)
   - Respond: `Immediately`
   - Response Code: `200`

2. URL webhook будет: `https://n8n.alu.stella-spb.ru/webhook/send-email`

## Шаг 3: Настройка Gmail/Яндекс почты

### Вариант A: Gmail (если используете Gmail)

1. Добавьте ноду **"Gmail"**
2. Подключите Google аккаунт
3. Настройте:
   - Operation: `Send Email`
   - To: `{{ $json.to }}`
   - Subject: `{{ $json.subject }}`
   - Message (HTML): `{{ $json.html || $json.message }}`

### Вариант B: Яндекс.Почта (SMTP)

1. Создайте пароль приложения в Яндекс:
   - Зайдите на https://id.yandex.ru/security/app-passwords
   - Создайте пароль для приложения "n8n"

2. Добавьте ноду **"Send Email"** (SMTP)
3. Настройте:
   - **SMTP Host**: `smtp.yandex.ru`
   - **SMTP Port**: `465`
   - **Secure**: `SSL/TLS`
   - **User**: `noreply@stella-spb.ru`
   - **Password**: `[пароль приложения из п.1]`
   - **From Email**: `noreply@stella-spb.ru`
   - **From Name**: `Glazing CRM`
   - **To Email**: `={{ $json.to }}`
   - **Subject**: `={{ $json.subject }}`
   - **Text**: `={{ $json.message }}`
   - **HTML**: `={{ $json.html }}`
   - **Attachments**: `={{ $json.attachments }}`

## Шаг 4: Сохраните и активируйте

1. Нажмите **"Save"** (дайте имя: "CRM Email Service")
2. Включите toggle **"Active"** в правом верхнем углу
3. Скопируйте Production Webhook URL

## Шаг 5: Добавьте URL в .env.local

```bash
N8N_WEBHOOK_URL=https://n8n.alu.stella-spb.ru/webhook/send-email
```

## JSON структура для n8n workflow (можно импортировать)

Скопируйте и импортируйте этот workflow:

\`\`\`json
{
  "name": "CRM Email Service",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "send-email",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-node",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "authentication": "smtp",
        "fromEmail": "={{ $json.from || 'noreply@stella-spb.ru' }}",
        "toEmail": "={{ $json.to }}",
        "subject": "={{ $json.subject }}",
        "emailFormat": "both",
        "text": "={{ $json.message || '' }}",
        "html": "={{ $json.html || '' }}",
        "options": {
          "allowUnauthorizedCerts": false
        }
      },
      "id": "email-node",
      "name": "Send Email",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 2,
      "position": [470, 300],
      "credentials": {
        "smtp": {
          "id": "1",
          "name": "Yandex SMTP"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { success: true, message: 'Email sent successfully', timestamp: $now } }}"
      },
      "id": "response-node",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [690, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Send Email",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send Email": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true
}
\`\`\`

## Использование в CRM

### Пример 1: Отправка уведомления о новом счете

\`\`\`typescript
import { sendEmail, newInvoiceTemplate } from '@/lib/email-service';

// После создания счета в route.ts
const emailTemplate = newInvoiceTemplate({
  invoiceNumber: parsedData.invoice.number,
  supplierName: parsedData.contractor.name,
  totalAmount: parsedData.invoice.total_amount,
  invoiceDate: parsedData.invoice.date,
  projectName: 'Проект #123',
});

await sendEmail({
  to: 'admin@stella-spb.ru',
  subject: emailTemplate.subject,
  html: emailTemplate.html,
  message: emailTemplate.message,
});
\`\`\`

### Пример 2: Приглашение пользователя

\`\`\`typescript
import { sendEmail, inviteUserTemplate } from '@/lib/email-service';

const emailTemplate = inviteUserTemplate({
  userName: 'Иван Иванов',
  userEmail: 'ivan@example.com',
  tempPassword: 'TempPass123',
});

await sendEmail({
  to: 'ivan@example.com',
  subject: emailTemplate.subject,
  html: emailTemplate.html,
  message: emailTemplate.message,
});
\`\`\`

### Пример 3: Отправка с вложением

\`\`\`typescript
await sendEmail({
  to: 'client@example.com',
  subject: 'Ваш счет',
  html: '<h1>Счет во вложении</h1>',
  attachments: [
    {
      filename: 'invoice.pdf',
      content: 'base64_encoded_content_here',
      contentType: 'application/pdf',
    },
  ],
});
\`\`\`

## Тестирование

1. Отправьте тестовый запрос через curl:

\`\`\`bash
curl -X POST https://n8n.alu.stella-spb.ru/webhook/send-email \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "your-email@example.com",
    "subject": "Test from n8n",
    "message": "This is a test email",
    "html": "<h1>This is a test email</h1><p>From n8n workflow</p>"
  }'
\`\`\`

2. Проверьте почту

## Дополнительные возможности

### Логирование в Supabase

Добавьте ноду **"HTTP Request"** для сохранения истории отправок:

\`\`\`
POST https://fpnugtlchxigwpqwiczc.supabase.co/rest/v1/email_logs
Headers:
  apikey: [SUPABASE_ANON_KEY]
  Authorization: Bearer [SUPABASE_ANON_KEY]
Body:
{
  "to": "={{ $json.to }}",
  "subject": "={{ $json.subject }}",
  "sent_at": "={{ $now }}",
  "status": "sent"
}
\`\`\`

### Уведомления в Telegram

Добавьте ноду **"Telegram"** для дублирования важных писем:

- Bot Token: получите от @BotFather
- Chat ID: ваш ID или ID группы
- Message: краткое уведомление о письме

## Безопасность

### Добавьте Basic Auth для webhook:

1. В ноде Webhook включите **Authentication: Basic Auth**
2. Создайте credentials с логином/паролем
3. Обновите код CRM:

\`\`\`typescript
const response = await fetch(n8nWebhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from('user:pass').toString('base64'),
  },
  body: JSON.stringify(data),
});
\`\`\`

## Мониторинг

1. В n8n: **Executions** → смотрите историю отправок
2. В Яндекс.Почте: проверяйте статистику отправки
3. Настройте алерты при ошибках

## Troubleshooting

### Email не отправляется

1. Проверьте пароль приложения Яндекс
2. Убедитесь что workflow активен
3. Проверьте логи в n8n: Executions → последнее выполнение
4. Проверьте SMTP настройки (хост, порт, SSL)

### Webhook не отвечает

1. Проверьте что workflow активен (зеленый toggle)
2. Проверьте URL webhook
3. Проверьте формат JSON в запросе

### Письма уходят в спам

1. Настройте SPF запись для домена
2. Настройте DKIM в Яндексе
3. Добавьте DMARC запись
4. Используйте корпоративную почту, не noreply
