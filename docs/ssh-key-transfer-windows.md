# Перенос SSH ключа на Windows

## Шаг 1: Скопировать ключ

Скопируйте приватный ключ (выше в терминале) и сохраните его на Windows в файл:
```
C:\Users\ВашеИмя\.ssh\id_rsa
```

## Шаг 2: Создать директорию .ssh (если её нет)

Откройте PowerShell и выполните:
```powershell
New-Item -Path $env:USERPROFILE\.ssh -ItemType Directory -Force
```

## Шаг 3: Сохранить ключ

1. Создайте файл `C:\Users\ВашеИмя\.ssh\id_rsa`
2. Скопируйте в него содержимое приватного ключа (от `-----BEGIN OPENSSH PRIVATE KEY-----` до `-----END OPENSSH PRIVATE KEY-----`)
3. Сохраните файл **без расширения** (именно `id_rsa`, а не `id_rsa.txt`)

## Шаг 4: Установить правильные права доступа

В PowerShell (от администратора):
```powershell
# Убрать наследование прав
icacls "$env:USERPROFILE\.ssh\id_rsa" /inheritance:r

# Дать права только вашему пользователю
icacls "$env:USERPROFILE\.ssh\id_rsa" /grant:r "$env:USERNAME:F"
```

## Шаг 5: Добавить ключ в SSH Agent (опционально)

```powershell
# Запустить ssh-agent
Start-Service ssh-agent

# Добавить ключ
ssh-add $env:USERPROFILE\.ssh\id_rsa
```

## Шаг 6: Проверить подключение

```powershell
ssh root@82.97.253.12
```

Должно подключиться без запроса пароля.

## Альтернатива: Использовать Git Bash на Windows

Если установлен Git for Windows:

1. Откройте Git Bash
2. Создайте файл:
```bash
mkdir -p ~/.ssh
nano ~/.ssh/id_rsa
```
3. Вставьте ключ, сохраните (Ctrl+X, Y, Enter)
4. Установите права:
```bash
chmod 600 ~/.ssh/id_rsa
```
5. Проверьте:
```bash
ssh root@82.97.253.12
```

## Безопасность

⚠️ **ВАЖНО:**
- Никогда не делитесь этим ключом
- Не загружайте его в публичные репозитории
- Храните резервную копию в безопасном месте (зашифрованная флешка, менеджер паролей)
- Рассмотрите возможность создания отдельного ключа для Windows компьютера

## Создание отдельного ключа для Windows (рекомендуется)

На Windows компьютере:
```powershell
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

Затем добавьте новый публичный ключ на сервер:
```powershell
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@82.97.253.12 "cat >> ~/.ssh/authorized_keys"
```

Это безопаснее, так как у каждого компьютера свой ключ.
