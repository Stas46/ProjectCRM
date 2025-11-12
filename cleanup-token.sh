#!/bin/bash
# Скрипт для удаления токена из истории Git

TOKEN="TELEGRAM_BOT_TOKEN_REMOVED"

# BFG - проще и быстрее, но нужно установить
# brew install bfg
# bfg --replace-text <(echo "$TOKEN==>TELEGRAM_BOT_TOKEN_REMOVED")

# Альтернатива - git filter-repo (рекомендуемый способ)
# brew install git-filter-repo
# echo "$TOKEN" > /tmp/token-to-remove.txt
# git filter-repo --replace-text /tmp/token-to-remove.txt

# Альтернатива 2 - git filter-branch (старый способ, работает везде)
git filter-branch --force --index-filter \
  "git grep -l '$TOKEN' | xargs -r sed -i 's/$TOKEN/TELEGRAM_BOT_TOKEN_REMOVED/g' || true" \
  --prune-empty --tag-name-filter cat -- --all

echo ""
echo "✅ Токен удален из истории"
echo ""
echo "⚠️  ВНИМАНИЕ: Теперь нужно сделать force push:"
echo "git push origin --force --all"
echo ""
echo "После этого все коллаборанты должны сделать:"
echo "git fetch origin"
echo "git reset --hard origin/master"
