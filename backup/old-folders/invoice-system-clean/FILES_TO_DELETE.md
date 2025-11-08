# ❌ Файлы для удаления

После развертывания новой чистой системы из папки `invoice-system-clean/`, можно **безопасно удалить** следующие старые файлы:

## 🗑️ База данных (старые схемы)

```
database/
database-schema/
supabase/
```

Файлы SQL в корне:
```
cloud-schema-complete.sql
cleanup-test-invoices.sql
create-schema.js
database-schema.sql
fix-invoices-columns.sql
fix-invoices-schema.sql
fix-rls-policies.sql
recreate-cloud-schema.js
recreate-invoices.js
reset-database.js
supabase-*.sql
test-project.sql
```

## 🗑️ Старые типы TypeScript

```
src/types/client.ts
src/types/project.ts
src/types/task.ts
src/types/employee.ts
src/types/crew.ts
src/types/shift.ts
src/types/message.ts
```

**Оставить только:**
- `src/types/invoice.ts` (заменить на новый из `invoice-system-clean/types/`)
- `src/types/supplier.ts` (заменить на новый из `invoice-system-clean/types/`)

## 🗑️ Старые страницы и компоненты

```
src/app/projects/
src/app/tasks/
src/app/employees/
src/app/crews/
src/app/clients/
src/components/ (почти все)
```

**Оставить только компоненты для работы со счетами.**

## 🗑️ Старые API endpoints

```
src/app/api/projects/
src/app/api/tasks/
src/app/api/employees/
src/app/api/clients/
src/app/api/suppliers/ (если есть старый)
```

**Заменить:**
- `src/app/api/smart-invoice/route.ts` (заменить на новый из `invoice-system-clean/api/`)

## 🗑️ Тестовые файлы

```
check-*.js
test-*.js
test-*.html
test-*.txt
create-test-invoice.js
create-multiple-invoices.js
migrate-categories.js
setup-test-project.js
verify-database.js
test-supplier-update.js
```

## 🗑️ Документация старого проекта

```
CHANGES_SUMMARY.md
FIX_REPORT.md
SUPABASE_CHECK_COMMANDS.sql
SUPABASE_FIELD_CHECK_REPORT.md
SUPABASE_SQL_COMMANDS.sql
TEST_INSTRUCTIONS.md
docs/ (если не нужна документация по Google Cloud)
```

## ✅ Что ОСТАВИТЬ

### Файлы конфигурации:
```
package.json
tsconfig.json
next.config.ts
eslint.config.mjs
postcss.config.mjs
.env.local
.gitignore
```

### Python парсер:
```
ultimate_invoice_parser.py
```

### Google Cloud:
```
google-credentials.json
```

### Новая система:
```
invoice-system-clean/ (вся папка)
```

### Рабочие директории:
```
temp/ (для временных файлов)
public/ (для статики, если нужна)
```

---

## 📋 План очистки

1. **Сделайте бэкап проекта** (на всякий случай)
2. Разверните новую систему из `invoice-system-clean/` (см. DEPLOYMENT.md)
3. Протестируйте загрузку счета
4. Убедитесь, что все работает
5. Удалите все файлы из списка выше

---

## 💡 Команда для очистки (PowerShell)

```powershell
# ВНИМАНИЕ: Выполняйте только после успешного развертывания новой системы!

# Удаление старых директорий
Remove-Item -Path "database" -Recurse -Force
Remove-Item -Path "database-schema" -Recurse -Force
Remove-Item -Path "src/app/projects" -Recurse -Force
Remove-Item -Path "src/app/tasks" -Recurse -Force
Remove-Item -Path "src/app/employees" -Recurse -Force
Remove-Item -Path "src/app/clients" -Recurse -Force
Remove-Item -Path "src/app/api/projects" -Recurse -Force
Remove-Item -Path "src/app/api/tasks" -Recurse -Force

# Удаление тестовых файлов
Get-ChildItem -Filter "test-*.js" | Remove-Item -Force
Get-ChildItem -Filter "check-*.js" | Remove-Item -Force
Get-ChildItem -Filter "*.sql" | Where-Object { $_.Name -ne "schema.sql" } | Remove-Item -Force

# Удаление старых типов
Remove-Item -Path "src/types/client.ts" -Force
Remove-Item -Path "src/types/project.ts" -Force
Remove-Item -Path "src/types/task.ts" -Force

echo "✅ Старые файлы удалены!"
```

---

## ⚠️ ВАЖНО

**НЕ УДАЛЯЙТЕ** ничего до:
1. Полного развертывания новой системы
2. Успешного теста загрузки счета
3. Создания бэкапа проекта
