# DNS настройки для проекта Glazing CRM

## Домен: alu.stella-spb.ru

### Основные записи

#### A-записи (указатели на IP сервера)
```
Тип: A
Имя: alu
Значение: 82.97.253.12
TTL: 3600

Тип: A
Имя: n8n.alu
Значение: 82.97.253.12
TTL: 3600

Тип: A  
Имя: www.alu
Значение: 82.97.253.12
TTL: 3600
```

### Яндекс.Почта для alu.stella-spb.ru

#### 1. MX запись (почтовый сервер)
```
Тип: MX
Имя: alu
Значение: mx.yandex.net.
Приоритет: 10
TTL: 3600
```

#### 2. SPF запись (защита от спама)
```
Тип: TXT
Имя: alu
Значение: v=spf1 include:_spf.yandex.net ~all
TTL: 3600
```

#### 3. DKIM запись (цифровая подпись)
**Как получить значение:**
1. Зайдите на https://connect.yandex.ru
2. Выберите организацию и домен alu.stella-spb.ru
3. Перейдите: Все настройки → Безопасность домена → DKIM-подпись
4. Нажмите "Получить ключ" или скопируйте существующий

```
Тип: TXT
Имя: mail._domainkey.alu
Значение: v=DKIM1; k=rsa; t=s; p=[ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ_ИЗ_ЯНДЕКСА]
TTL: 3600
```

#### 4. DMARC запись (политика безопасности)
```
Тип: TXT
Имя: _dmarc.alu
Значение: v=DMARC1; p=none; rua=mailto:admin@alu.stella-spb.ru
TTL: 3600
```

#### 5. Autodiscover (автоматическая настройка почтовых клиентов)
```
Тип: CNAME
Имя: autodiscover.alu
Значение: autodiscover.yandex.ru.
TTL: 3600
```

#### 6. Autoconfig для Mozilla Thunderbird (опционально)
```
Тип: CNAME
Имя: autoconfig.alu
Значение: autoconfig.yandex.ru.
TTL: 3600
```

### Проверка DNS

#### Проверить A-записи:
```bash
host alu.stella-spb.ru 8.8.8.8
host n8n.alu.stella-spb.ru 8.8.8.8
```

#### Проверить MX-запись:
```bash
host -t MX alu.stella-spb.ru 8.8.8.8
```

#### Проверить SPF:
```bash
host -t TXT alu.stella-spb.ru 8.8.8.8
```

#### Проверить DKIM:
```bash
host -t TXT mail._domainkey.alu.stella-spb.ru 8.8.8.8
```

#### Проверить DMARC:
```bash
host -t TXT _dmarc.alu.stella-spb.ru 8.8.8.8
```

### Онлайн инструменты проверки

- **MX Toolbox**: https://mxtoolbox.com/SuperTool.aspx
- **Яндекс проверка**: https://webmaster.yandex.ru/tools/check-host/
- **Google Admin Toolbox**: https://toolbox.googleapps.com/apps/checkmx/

### Время распространения DNS

Обычно DNS записи обновляются:
- **Минимум**: 5-15 минут
- **Обычно**: 30-60 минут  
- **Максимум**: до 48 часов (редко)

### После настройки DNS

1. **Проверить почту**: Отправьте письмо на admin@alu.stella-spb.ru
2. **Настроить SSL для n8n**: Запустить `/tmp/setup_n8n_ssl.sh` на сервере
3. **Проверить n8n**: https://n8n.alu.stella-spb.ru

## Настройка в Яндекс.Почте

### 1. Добавление домена
1. Перейдите на https://connect.yandex.ru
2. Войдите в организацию
3. Нажмите "Домены" → "Добавить домен"
4. Введите: `alu.stella-spb.ru`
5. Подтвердите владение доменом

### 2. Создание почтовых ящиков
1. Перейдите в "Сотрудники"
2. Нажмите "Добавить" → "Создать сотрудника"
3. Создайте нужные ящики:
   - admin@alu.stella-spb.ru
   - info@alu.stella-spb.ru
   - noreply@alu.stella-spb.ru

### 3. Настройка безопасности
1. Включите DKIM-подпись
2. Настройте SPF
3. Включите DMARC

## Использование в приложении

### Настройка SMTP для отправки писем из CRM

Добавьте в `.env.local`:
```env
# Яндекс.Почта SMTP
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@alu.stella-spb.ru
SMTP_PASSWORD=your_password_here
SMTP_FROM=noreply@alu.stella-spb.ru
SMTP_FROM_NAME=Glazing CRM
```

### Пример использования в Next.js с nodemailer:

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

await transporter.sendMail({
  from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
  to: 'client@example.com',
  subject: 'Новый счет создан',
  html: '<h1>Ваш счет готов</h1>',
});
```

## Troubleshooting

### Письма уходят в спам
1. Проверьте DKIM подпись
2. Проверьте SPF запись
3. Добавьте DMARC
4. Прогрейте домен (отправляйте письма постепенно)

### DNS не обновляется
1. Проверьте TTL (должен быть 3600 или меньше)
2. Очистите DNS кэш: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` (macOS)
3. Используйте другой DNS сервер для проверки

### Яндекс не видит DNS записи
1. Подождите 1-2 часа после добавления
2. Проверьте записи через https://webmaster.yandex.ru/tools/check-host/
3. Убедитесь что нет точки в конце имени записи (зависит от панели управления DNS)
