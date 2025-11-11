-- Обновление схемы чата для поддержки разных типов агентов
-- Дата: 11.11.2025

-- 1. Добавляем поле agent_type для разделения обычного чата и личного помощника
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50) DEFAULT 'general' CHECK (agent_type IN ('general', 'personal_assistant'));

-- 2. Добавляем поле conversation_id для группировки сообщений в беседы
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID DEFAULT gen_random_uuid();

-- 3. Создаем индекс для быстрой фильтрации по типу агента и пользователю
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_agent 
ON chat_messages(user_id, agent_type, created_at DESC);

-- 4. Создаем индекс для быстрого поиска по беседам
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation 
ON chat_messages(conversation_id, created_at);

-- 5. Обновляем существующие сообщения (помечаем как общий чат)
UPDATE chat_messages 
SET agent_type = 'general' 
WHERE agent_type IS NULL;

-- 6. Добавляем комментарии для документации
COMMENT ON COLUMN chat_messages.agent_type IS 'Тип агента: general (обычный чат), personal_assistant (личный помощник с доступом к CRM данным)';
COMMENT ON COLUMN chat_messages.conversation_id IS 'UUID беседы для группировки связанных сообщений';

-- 7. Обновляем статистику использования для учета типов агентов
ALTER TABLE chat_usage_stats 
ADD COLUMN IF NOT EXISTS agent_usage JSONB DEFAULT '{}';

COMMENT ON COLUMN chat_usage_stats.agent_usage IS 'Статистика использования по типам агентов: {"general": {...}, "personal_assistant": {...}}';
