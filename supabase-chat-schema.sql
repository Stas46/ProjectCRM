-- Добавление таблиц для чата проекта

-- Таблица сообщений проекта
CREATE TABLE IF NOT EXISTS project_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE project_messages IS 'Сообщения в чате проекта';

-- Таблица вложений к сообщениям
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES project_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  file_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE message_attachments IS 'Вложения к сообщениям проекта';

-- Создаем политики доступа для сообщений
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Сообщения доступны авторизованным пользователям проекта" 
  ON project_messages FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_team WHERE project_id = project_messages.project_id
      UNION
      SELECT owner_id FROM projects WHERE id = project_messages.project_id
      UNION
      SELECT manager_id FROM projects WHERE id = project_messages.project_id
    )
  );

CREATE POLICY "Пользователи могут создавать сообщения в проектах, к которым они имеют доступ" 
  ON project_messages FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM project_team WHERE project_id = project_messages.project_id
      UNION
      SELECT owner_id FROM projects WHERE id = project_messages.project_id
      UNION
      SELECT manager_id FROM projects WHERE id = project_messages.project_id
    )
  );

CREATE POLICY "Пользователи могут обновлять только свои сообщения" 
  ON project_messages FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять только свои сообщения" 
  ON project_messages FOR DELETE 
  USING (auth.uid() = user_id);

-- Создаем политики доступа для вложений
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Вложения доступны авторизованным пользователям проекта" 
  ON message_attachments FOR SELECT 
  USING (
    message_id IN (
      SELECT id FROM project_messages WHERE auth.uid() IN (
        SELECT user_id FROM project_team WHERE project_id = project_messages.project_id
        UNION
        SELECT owner_id FROM projects WHERE id = project_messages.project_id
        UNION
        SELECT manager_id FROM projects WHERE id = project_messages.project_id
      )
    )
  );

CREATE POLICY "Пользователи могут добавлять вложения к своим сообщениям" 
  ON message_attachments FOR INSERT 
  WITH CHECK (
    message_id IN (
      SELECT id FROM project_messages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Пользователи могут удалять вложения к своим сообщениям" 
  ON message_attachments FOR DELETE 
  USING (
    message_id IN (
      SELECT id FROM project_messages WHERE user_id = auth.uid()
    )
  );

-- Создание хранилища для вложений
INSERT INTO storage.buckets (id, name) 
VALUES ('attachments', 'Вложения к сообщениям') 
ON CONFLICT (id) DO NOTHING;

-- Политики доступа к хранилищу вложений
CREATE POLICY "Вложения доступны для чтения авторизованным пользователям" 
  ON storage.objects FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'attachments'
  );

CREATE POLICY "Авторизованные пользователи могут загружать вложения" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id = 'attachments'
  );

CREATE POLICY "Пользователи могут обновлять только свои вложения" 
  ON storage.objects FOR UPDATE 
  USING (
    auth.uid()::text = (storage.foldername(name))[1] AND 
    bucket_id = 'attachments'
  );

CREATE POLICY "Пользователи могут удалять только свои вложения" 
  ON storage.objects FOR DELETE 
  USING (
    auth.uid()::text = (storage.foldername(name))[1] AND 
    bucket_id = 'attachments'
  );

-- Создаем индексы для ускорения запросов
CREATE INDEX IF NOT EXISTS project_messages_project_id_idx ON project_messages(project_id);
CREATE INDEX IF NOT EXISTS project_messages_user_id_idx ON project_messages(user_id);
CREATE INDEX IF NOT EXISTS project_messages_created_at_idx ON project_messages(created_at);
CREATE INDEX IF NOT EXISTS message_attachments_message_id_idx ON message_attachments(message_id);