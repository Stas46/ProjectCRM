-- Таблица для хранения вложений к задачам
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size BIGINT NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Таблица для хранения комментариев к задачам
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Таблица для хранения вложений к комментариям
CREATE TABLE IF NOT EXISTS public.comment_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size BIGINT NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Индексы для ускорения запросов
CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS task_comments_user_id_idx ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS comment_attachments_comment_id_idx ON public.comment_attachments(comment_id);

-- Настройка RLS (Row Level Security)
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

-- Политика доступа к вложениям задач
CREATE POLICY "Вложения к задачам доступны авторизованным пользователям проекта" 
  ON public.task_attachments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_attachments.task_id AND pm.user_id = auth.uid()
    )
  );

-- Политика доступа к комментариям задач
CREATE POLICY "Комментарии к задачам доступны авторизованным пользователям проекта" 
  ON public.task_comments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_comments.task_id AND pm.user_id = auth.uid()
    )
  );

-- Политика доступа к вложениям комментариев
CREATE POLICY "Вложения к комментариям доступны авторизованным пользователям проекта" 
  ON public.comment_attachments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.task_comments tc
      JOIN public.tasks t ON tc.task_id = t.id
      JOIN public.project_members pm ON t.project_id = pm.project_id
      WHERE tc.id = comment_attachments.comment_id AND pm.user_id = auth.uid()
    )
  );

-- Разрешить авторизованным пользователям добавлять вложения к задачам
CREATE POLICY "Пользователи могут добавлять вложения к задачам своих проектов" 
  ON public.task_attachments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_attachments.task_id AND pm.user_id = auth.uid()
    )
  );

-- Разрешить авторизованным пользователям добавлять комментарии к задачам
CREATE POLICY "Пользователи могут добавлять комментарии к задачам своих проектов" 
  ON public.task_comments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_comments.task_id AND pm.user_id = auth.uid()
    )
  );

-- Разрешить авторизованным пользователям добавлять вложения к своим комментариям
CREATE POLICY "Пользователи могут добавлять вложения к своим комментариям" 
  ON public.comment_attachments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_comments tc
      WHERE tc.id = comment_attachments.comment_id AND tc.user_id = auth.uid()
    )
  );

-- Настройка хранилища для вложений
-- (Убедитесь, что бакет 'attachments' уже создан в Supabase Storage)

-- Разрешить пользователям удалять свои комментарии
CREATE POLICY "Пользователи могут удалять свои комментарии" 
  ON public.task_comments FOR DELETE 
  USING (user_id = auth.uid());

-- Разрешить пользователям удалять вложения своих комментариев
CREATE POLICY "Пользователи могут удалять вложения своих комментариев" 
  ON public.comment_attachments FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.task_comments tc
      WHERE tc.id = comment_attachments.comment_id AND tc.user_id = auth.uid()
    )
  );

-- Разрешить пользователям удалять вложения своих задач
CREATE POLICY "Пользователи могут удалять вложения к задачам своих проектов" 
  ON public.task_attachments FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_attachments.task_id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
    )
  );