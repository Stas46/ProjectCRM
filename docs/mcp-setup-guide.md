# Настройка MCP сервера n8n

## Что такое MCP?

Model Context Protocol (MCP) - это протокол, который позволяет AI ассистентам (как GitHub Copilot или Claude) подключаться к внешним сервисам и инструментам. В нашем случае - к n8n для управления workflows.

## Вариант 1: Claude Desktop App (рекомендуется)

### Установка Claude Desktop

1. Скачайте Claude Desktop: https://claude.ai/download
2. Установите приложение

### Настройка n8n-mcp в Claude Desktop

1. Найдите конфигурационный файл Claude:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Откройте файл и добавьте конфигурацию:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "n8n-mcp"],
      "env": {
        "N8N_URL": "https://n8n.alu.stella-spb.ru",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMDczYjEwZC00ZGY4LTQyM2EtOTM0ZS1hMzUyZjAwYzU5NzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyOTQ0OTU2fQ.XKt7jGnIgpoWAThwWK9lhkm4z8THbkAAoRAf_cHW3x0"
      }
    }
  }
}
```

3. Перезапустите Claude Desktop

4. В новом чате Claude должен увидеть инструменты n8n (будет иконка 🔌 или упоминание о подключенных инструментах)

### Доступные команды в Claude

После подключения вы сможете попросить Claude:

```
- "Покажи все мои workflows в n8n"
- "Создай новый workflow для отправки email"
- "Покажи детали workflow 'CRM Invoice Email Notifications'"
- "Активируй workflow с ID 1"
- "Покажи последние executions"
```

## Вариант 2: MCP Inspector (для тестирования)

MCP Inspector - это веб-интерфейс для тестирования MCP серверов.

### Запуск Inspector

```bash
export N8N_URL="https://n8n.alu.stella-spb.ru"
export N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMDczYjEwZC00ZGY4LTQyM2EtOTM0ZS1hMzUyZjAwYzU5NzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyOTQ0OTU2fQ.XKt7jGnIgpoWAThwWK9lhkm4z8THbkAAoRAf_cHW3x0"

npx -y @modelcontextprotocol/inspector npx n8n-mcp
```

Откроется браузер с интерфейсом Inspector, где вы можете:
- Посмотреть все доступные инструменты (tools)
- Протестировать вызовы API к n8n
- Проверить подключение

## Вариант 3: VS Code с расширением (экспериментально)

⚠️ **Внимание:** GitHub Copilot в VS Code пока не поддерживает кастомные MCP серверы официально.

Есть экспериментальное расширение, но оно может работать нестабильно:

1. Установите расширение: https://marketplace.visualstudio.com/items?itemName=modelcontextprotocol.mcp-vscode

2. Откройте настройки VS Code (⌘+, на Mac или Ctrl+, на Windows)

3. Найдите "MCP: Servers" и добавьте:

```json
{
  "mcp.servers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "n8n-mcp"],
      "env": {
        "N8N_URL": "https://n8n.alu.stella-spb.ru",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMDczYjEwZC00ZGY4LTQyM2EtOTM0ZS1hMzUyZjAwYzU5NzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyOTQ0OTU2fQ.XKt7jGnIgpoWAThwWK9lhkm4z8THbkAAoRAf_cHW3x0"
      }
    }
  }
}
```

## Что можно делать с n8n-mcp?

После настройки MCP сервера AI ассистент сможет:

### 1. Управление Workflows
- `list_workflows` - получить список всех workflows
- `get_workflow` - получить детали конкретного workflow
- `create_workflow` - создать новый workflow
- `update_workflow` - обновить существующий workflow
- `delete_workflow` - удалить workflow
- `activate_workflow` - активировать workflow
- `deactivate_workflow` - деактивировать workflow

### 2. Управление Executions
- `list_executions` - получить список выполнений
- `get_execution` - получить детали конкретного выполнения

### 3. Управление Credentials
- `list_credentials` - список credentials
- `create_credential` - создать новый credential

## Проверка подключения

После настройки проверьте подключение в Claude Desktop:

```
Ты: "Покажи мне все workflows в n8n"

Claude должен вывести список workflows, включая:
- CRM Invoice Email Notifications (Active)
```

## Безопасность

⚠️ **Важно:**

- API ключ хранится в конфиге - не делитесь им
- Не коммитьте `.n8n-mcp-config.json` в git (уже добавлен в .gitignore)
- API ключ можно отозвать в настройках n8n в любой момент
- Рекомендуется создать отдельный API ключ для MCP с ограниченными правами

## Отзыв API ключа

Если ключ скомпрометирован:

1. Откройте https://n8n.alu.stella-spb.ru
2. Settings → API
3. Удалите старый ключ
4. Создайте новый
5. Обновите конфигурацию MCP

## Альтернатива: Прямое использование n8n API

Если MCP не работает, можно использовать n8n API напрямую через curl или скрипты:

```bash
# Получить список workflows
curl -H "X-N8N-API-KEY: ВАШ_API_КЛЮЧ" \
  https://n8n.alu.stella-spb.ru/api/v1/workflows

# Получить конкретный workflow
curl -H "X-N8N-API-KEY: ВАШ_API_КЛЮЧ" \
  https://n8n.alu.stella-spb.ru/api/v1/workflows/1

# Активировать workflow
curl -X PATCH \
  -H "X-N8N-API-KEY: ВАШ_API_КЛЮЧ" \
  -H "Content-Type: application/json" \
  -d '{"active": true}' \
  https://n8n.alu.stella-spb.ru/api/v1/workflows/1
```

## Troubleshooting

### MCP сервер не подключается

1. Проверьте что n8n доступен:
```bash
curl -I https://n8n.alu.stella-spb.ru
```

2. Проверьте API ключ:
```bash
curl -H "X-N8N-API-KEY: ВАШ_КЛЮЧ" https://n8n.alu.stella-spb.ru/api/v1/workflows
```

3. Проверьте логи Claude Desktop:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

### Inspector не открывается

- Убедитесь что порт 6274 свободен
- Попробуйте другой браузер
- Проверьте что переменные окружения установлены:
```bash
echo $N8N_URL
echo $N8N_API_KEY
```

## Полезные ссылки

- n8n API Documentation: https://docs.n8n.io/api/
- n8n-mcp GitHub: https://github.com/czlonkowski/n8n-mcp
- Model Context Protocol Spec: https://spec.modelcontextprotocol.io/
- Claude Desktop: https://claude.ai/download
