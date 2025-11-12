#!/bin/bash

# Тест API файлов проекта
PROJECT_ID="9cbb720f-a42c-4bac-b433-b74b0c3844dc"

echo "🔍 Проверка API файлов проекта..."
echo ""

# Проверяем список файлов
curl -s "http://localhost:3000/api/projects/$PROJECT_ID/files" | jq '.'

echo ""
echo "Если видите JSON с полями success, files, folders - API работает!"
echo "Если ошибка - нужно применить SQL миграцию в Supabase"
