# n8n Deployment для Glazing CRM

## Что такое n8n?

n8n - это open-source платформа для автоматизации рабочих процессов (workflow automation), аналог Zapier/Make.com. Позволяет создавать сценарии без кода, связывая различные сервисы через API.

## Установка

### Автоматическая установка через GitHub Actions

При деплое проекта n8n автоматически устанавливается и запускается через PM2.

### Ручная установка

1. Установите n8n глобально:
```bash
npm install -g n8n
```

2. Создайте директорию для данных:
```bash
mkdir -p /var/www/alu.stella-spb.ru/n8n
```

3. Скопируйте файл окружения:
```bash
cp n8n/.env.example n8n/.env
# Отредактируйте n8n/.env и установите пароль
```

4. Запустите через PM2:
```bash
pm2 start n8n/ecosystem.config.js
pm2 save
```

5. Настройте Nginx:
```bash
sudo cp n8n/nginx.conf /etc/nginx/sites-available/n8n.alu.stella-spb.ru
sudo ln -s /etc/nginx/sites-available/n8n.alu.stella-spb.ru /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

6. Получите SSL сертификат:
```bash
sudo certbot --nginx -d n8n.alu.stella-spb.ru
```

## Доступ

- **URL**: https://n8n.alu.stella-spb.ru
- **Логин**: admin (измените в .env)
- **Пароль**: указан в .env файле

## Интеграция с CRM

n8n можно использовать для:

1. **Автоматизация обработки счетов**
   - Webhook при создании нового счета
   - Уведомления в Telegram
   - Синхронизация с 1С

2. **Обработка клиентских запросов**
   - Автоматические ответы
   - Создание задач в CRM
   - Email рассылки

3. **Интеграция с внешними сервисами**
   - Синхронизация с Google Sheets
   - Отправка данных в аналитику
   - Backup в облачные хранилища

## Примеры webhook для CRM

Добавьте в код CRM отправку webhook при создании счета:

```typescript
// В route.ts после создания счета
await fetch('https://n8n.alu.stella-spb.ru/webhook/invoice-created', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invoice_id: invoiceId,
    invoice_number: parsedData.invoice.number,
    total_amount: parsedData.invoice.total_amount,
    supplier: parsedData.contractor.name,
    project_id: projectId
  })
});
```

## Управление

```bash
# Просмотр логов
pm2 logs n8n

# Перезапуск
pm2 restart n8n

# Остановка
pm2 stop n8n

# Статус
pm2 status
```

## База данных

По умолчанию используется SQLite:
- Путь: `/var/www/alu.stella-spb.ru/n8n/database.sqlite`
- Backup: рекомендуется делать регулярные копии файла БД

## Безопасность

1. Обязательно измените пароль в `.env`
2. Используйте HTTPS (настраивается через certbot)
3. Ограничьте доступ по IP если нужно (в Nginx)
4. Регулярно обновляйте n8n: `npm update -g n8n && pm2 restart n8n`

## Обновление

```bash
npm update -g n8n
pm2 restart n8n
```
