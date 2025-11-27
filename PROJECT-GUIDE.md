# 📋 Полная инструкция по проекту ProjectCRM

## 🖥️ Сервер

**IP адрес:** `82.97.253.12`  
**Локация:** Нидерланды (обход блокировок РФ)  
**ОС:** Ubuntu 22.04  
**SSH доступ:** `ssh root@82.97.253.12`

### SSH Ключ доступа

Приватный SSH ключ находится на вашем компьютере:
- **Путь:** `C:\Users\Stas\.ssh\id_rsa`
- **Публичный ключ:** `C:\Users\Stas\.ssh\id_rsa.pub`

Подключение без пароля (ключ уже добавлен на сервер):
```powershell
ssh root@82.97.253.12
```

---

## 📁 Структура проекта на сервере

### Production (рабочая версия)
- **Путь:** `/var/www/alu.stella-spb.ru`
- **Домен:** https://alu.stella-spb.ru
- **Порт:** 3000 (внутренний, через Nginx)
- **Процесс:** PM2 с именем `crm-glazing`

### Исходники (для разработки)
- **Путь:** `/root/ProjectCRM`
- **Синхронизация:** Dropbox → `C:\Users\Stas\Dropbox\Glazing CRM\ProjectCRM`
- **Git репозиторий:** https://github.com/Stas46/ProjectCRM

---

## 🚀 Сервисы и компоненты

### 1. Next.js CRM приложение

**Production:**
```bash
# Проверить статус
ssh root@82.97.253.12 "pm2 status crm-glazing"

# Логи
ssh root@82.97.253.12 "pm2 logs crm-glazing --lines 100"

# Перезапуск
ssh root@82.97.253.12 "pm2 restart crm-glazing"
```

**Настройки:**
- Node.js 18+
- Next.js 15.5.3
- PM2 для управления процессом
- Порт: 3000

### 2. OpenHands AI Assistant

**Доступ:**
- **URL:** https://openhands.alu.stella-spb.ru
- **Логин:** `admin`
- **Пароль:** `!@124880Vkt`

**На сервере:**
```bash
# Проверить статус контейнера
ssh root@82.97.253.12 "docker ps | grep openhands"

# Логи
ssh root@82.97.253.12 "docker logs openhands --tail 100"

# Перезапуск
ssh root@82.97.253.12 "docker restart openhands"

# Остановить
ssh root@82.97.253.12 "docker stop openhands"

# Запустить
ssh root@82.97.253.12 "docker start openhands"
```

**Workspace:**
- Путь на сервере: `/root/ProjectCRM`
- Монтируется в контейнер: `/opt/workspace_base` → `/workspace`
- Все изменения OpenHands сразу применяются к файлам проекта

### 3. Nginx (веб-сервер)

**Конфигурации:**
```bash
# Основной сайт CRM
/etc/nginx/sites-available/alu.stella-spb.ru

# OpenHands
/etc/nginx/sites-available/openhands

# Проверить конфигурацию
ssh root@82.97.253.12 "nginx -t"

# Перезагрузить
ssh root@82.97.253.12 "systemctl reload nginx"
```

**SSL сертификаты:**
- Let's Encrypt (автоматическое продление)
- Срок действия: до 25 февраля 2026
- Обновление: `certbot renew --dry-run`

### 4. База данных Supabase

**Подключение:**
- URL: https://supabase.com
- Проект: (в переменных окружения)
- Таблицы: projects, invoices, users, suppliers, tasks, files

**Схема БД:**
```sql
-- projects
- id, project_name, project_number, title, description, budget, notes, status, created_at, updated_at

-- invoices
- id, supplier_id, amount, date, status, category, items, pdf_url, ocr_text, created_at

-- suppliers
- id, name, inn, contact_info, created_at

-- tasks
- id, project_id, title, description, status, assigned_to, created_at

-- files
- id, filename, file_path, file_type, created_at
```

### 5. Cloudflare Worker Proxy

**Назначение:** Обход блокировки OpenAI и Anthropic в России

**URL:** `https://openai-proxy.z9924646.workers.dev`

**Использование:**
- OpenAI: `https://openai-proxy.z9924646.workers.dev/openai/v1/...`
- Anthropic: `https://openai-proxy.z9924646.workers.dev/anthropic/v1/...`

**Код:** `cloudflare-worker/openai-proxy.js`

**Управление:**
- Панель: https://dash.cloudflare.com/
- Workers & Pages → openai-proxy

---

## 🔑 API Ключи

### OpenAI
```
sk-proj-eikpERJzKEpBIEoo-BYd...
```

### Anthropic Claude
```
sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Доступные модели:**
- `claude-sonnet-4-20250514` (рекомендуется)
- `claude-haiku-4-20250514` (быстрая)
- `claude-opus-4-20250514` (продвинутая)

**Лимиты:** Tier 1, $100/месяц

**Примечание:** Полный ключ хранится в `.env.local` на сервере

### Supabase
- URL и ключи в `.env.local`

### Yandex Vision OCR
- В переменных окружения для распознавания счетов

---

## 🔄 CI/CD - Автоматический деплой

**GitHub Actions:**
- Файл: `.github/workflows/deploy.yml`
- Триггер: Push в `master` ветку

**Процесс:**
1. Push в GitHub
2. GitHub Actions подключается к серверу через SSH
3. `git pull` в `/var/www/alu.stella-spb.ru`
4. `npm install --production`
5. `npm run build`
6. `pm2 restart crm-glazing`

**Команды для деплоя вручную:**
```bash
# На сервере
cd /var/www/alu.stella-spb.ru
git pull
npm install --production
npm run build
pm2 restart crm-glazing
```

---

## 📱 Telegram Bot

**Назначение:** Уведомления о новых счетах и задачах

**Файлы:**
- `src/lib/telegram-helper.ts` - основная логика
- `TELEGRAM-BOT-SETUP.md` - документация

**Настройка:**
- Bot токен в переменных окружения
- Chat ID для уведомлений

---

## 🛠️ Полезные команды

### Мониторинг сервера
```bash
# Проверка памяти
ssh root@82.97.253.12 "free -h"

# Проверка диска
ssh root@82.97.253.12 "df -h"

# Процессы
ssh root@82.97.253.12 "htop"

# Docker контейнеры
ssh root@82.97.253.12 "docker ps -a"
```

### Git операции
```bash
# На сервере в /root/ProjectCRM
ssh root@82.97.253.12 "cd /root/ProjectCRM && git status"
ssh root@82.97.253.12 "cd /root/ProjectCRM && git pull"
ssh root@82.97.253.12 "cd /root/ProjectCRM && git log --oneline -10"
```

### PM2 управление
```bash
# Список процессов
ssh root@82.97.253.12 "pm2 list"

# Подробная информация
ssh root@82.97.253.12 "pm2 show crm-glazing"

# Мониторинг в реальном времени
ssh root@82.97.253.12 "pm2 monit"

# Сохранить конфигурацию
ssh root@82.97.253.12 "pm2 save"
```

### Docker управление OpenHands
```bash
# Список всех контейнеров
ssh root@82.97.253.12 "docker ps -a"

# Остановить OpenHands
ssh root@82.97.253.12 "docker stop openhands"

# Запустить заново
ssh root@82.97.253.12 "docker start openhands"

# Удалить старые runtime контейнеры
ssh root@82.97.253.12 "docker ps -a --filter 'name=openhands-runtime' --filter 'status=exited' -q | xargs -r docker rm"

# Логи
ssh root@82.97.253.12 "docker logs openhands --tail 200 --follow"
```

---

## 🌐 DNS настройки

**Провайдер:** Spaceweb (https://my.spaceweb.ru)  
**Домен:** stella-spb.ru  
**Nameservers:** ns1-4.spaceweb.ru, ns1-4.spaceweb.pro

**A-записи:**
- `alu.stella-spb.ru` → `82.97.253.12`
- `openhands.alu.stella-spb.ru` → `82.97.253.12`

---

## 📝 Локальная разработка

**На вашем компьютере:**
```powershell
# Путь к проекту
cd "C:\Users\Stas\Dropbox\Glazing CRM\ProjectCRM"

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Открыть в браузере
http://localhost:3000
```

**Переменные окружения:**
Создайте `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
YANDEX_VISION_API_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

---

## 🔐 Безопасность

### SSH ключи
- Приватный ключ **НИКОГДА** не передавайте
- Храните в `C:\Users\Stas\.ssh\` с правами только для вас

### Пароли и ключи
- OpenHands: `admin / !@124880Vkt`
- API ключи в `.env.local` (не в Git!)
- Суппаbase: только через переменные окружения

### Бэкапы
```bash
# База данных - автоматически через Supabase
# Файлы проекта - синхронизируются с Dropbox
# Git - резервная копия на GitHub
```

---

## 📞 Поддержка и документация

**Документация проекта:**
- `README.md` - общее описание
- `TELEGRAM-BOT-SETUP.md` - настройка Telegram
- `docs/` - детальная документация
- `cloudflare-worker/README.md` - инструкция по прокси

**Полезные ссылки:**
- OpenHands: https://docs.openhands.dev
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Anthropic: https://docs.anthropic.com

---

## 🚨 Аварийное восстановление

### Если сайт не работает:
```bash
# 1. Проверить PM2
ssh root@82.97.253.12 "pm2 list"
ssh root@82.97.253.12 "pm2 restart crm-glazing"

# 2. Проверить Nginx
ssh root@82.97.253.12 "nginx -t"
ssh root@82.97.253.12 "systemctl status nginx"

# 3. Проверить логи
ssh root@82.97.253.12 "pm2 logs crm-glazing --lines 100"
```

### Если OpenHands не работает:
```bash
# 1. Перезапустить контейнер
ssh root@82.97.253.12 "docker restart openhands"

# 2. Проверить логи
ssh root@82.97.253.12 "docker logs openhands --tail 100"

# 3. Проверить Nginx
ssh root@82.97.253.12 "systemctl status nginx"
```

### Полный перезапуск:
```bash
ssh root@82.97.253.12 "pm2 restart all && docker restart openhands && systemctl reload nginx"
```

---

**Создано:** 27 ноября 2025  
**Последнее обновление:** 27 ноября 2025
