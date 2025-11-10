-- ===================================
-- ДОБАВЛЕНИЕ ПОЛЯ assignee_id В TASKS
-- ===================================

-- Проверяем существование поля
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'assignee_id';

-- Если поля нет - добавляем
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id);

-- Создаём индекс для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- Проверка
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;
