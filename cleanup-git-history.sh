#!/bin/bash
set -e

echo "🔧 Начинаю очистку истории Git от токена..."
echo ""

cd /Users/stanislavtkachev/Dropbox/Glazing\ CRM/ProjectCRM

# Создаем бэкап текущей ветки
git branch backup-before-cleanup

echo "✅ Создан backup ветки: backup-before-cleanup"
echo ""

# Удаляем токен из всех коммитов
echo "🧹 Удаляю токен из истории..."
git filter-branch --force --tree-filter '
  if [ -f "docs/n8n-integration-plan.md" ]; then
    sed -i "" "s/TELEGRAM_BOT_TOKEN_REMOVED/TELEGRAM_BOT_TOKEN_REMOVED/g" docs/n8n-integration-plan.md 2>/dev/null || true
  fi
  if [ -f "n8n/workflows/telegram-notifications.json" ]; then
    sed -i "" "s/TELEGRAM_BOT_TOKEN_REMOVED/{{\$credentials.telegramBotToken}}/g" n8n/workflows/telegram-notifications.json 2>/dev/null || true
  fi
' --prune-empty --tag-name-filter cat -- --all

echo ""
echo "✅ История очищена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Проверьте изменения: git log --oneline -10"
echo "2. Force push: git push origin --force --all"
echo "3. Удалите backup ветку: git branch -D backup-before-cleanup"
echo ""
echo "⚠️  ВНИМАНИЕ: После force push все коллаборанты должны сделать:"
echo "   git fetch origin"
echo "   git reset --hard origin/master"
