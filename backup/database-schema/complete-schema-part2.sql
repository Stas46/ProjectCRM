-- ========================================
-- ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ - ЧАСТЬ 2
-- Комментарии к задачам, Бригады, Смены, Чаты
-- ========================================

-- ========================================
-- 7. КОММЕНТАРИИ К ЗАДАЧАМ
-- ========================================

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  
  -- Содержимое
  text TEXT NOT NULL,
  
  -- Метаданные
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_author_id ON public.task_comments(author_id);
CREATE INDEX idx_task_comments_parent_id ON public.task_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_task_comments_created_at ON public.task_comments(created_at DESC);

-- ========================================
-- 8. ВЛОЖЕНИЯ К ЗАДАЧАМ
-- ========================================

CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  uploaded_by_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Информация о файле
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Дополнительно
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Индексы
CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX idx_task_attachments_comment_id ON public.task_attachments(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by_id);
CREATE INDEX idx_task_attachments_created_at ON public.task_attachments(created_at DESC);

-- ========================================
-- 9. БРИГАДЫ
-- ========================================

CREATE TABLE public.crews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  
  -- Метрики
  members_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_crews_name ON public.crews(name);
CREATE INDEX idx_crews_is_active ON public.crews(is_active);

-- ========================================
-- 10. ЧЛЕНЫ БРИГАД
-- ========================================

CREATE TABLE public.crew_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  crew_id UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Роль в бригаде
  role VARCHAR(100),
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  left_at TIMESTAMP WITH TIME ZONE,
  
  -- Уникальность
  CONSTRAINT unique_crew_member UNIQUE (crew_id, employee_id)
);

-- Индексы
CREATE INDEX idx_crew_members_crew_id ON public.crew_members(crew_id);
CREATE INDEX idx_crew_members_employee_id ON public.crew_members(employee_id);
CREATE INDEX idx_crew_members_is_active ON public.crew_members(is_active);

-- ========================================
-- 11. СМЕНЫ
-- ========================================

CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  title VARCHAR(255) NOT NULL,
  
  -- Связи
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL,
  
  -- Время
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Локация
  location TEXT NOT NULL,
  
  -- Дополнительная информация
  description TEXT,
  notes TEXT,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- Метрики
  assignees_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_shift_times CHECK (end_time > start_time)
);

-- Индексы
CREATE INDEX idx_shifts_project_id ON public.shifts(project_id);
CREATE INDEX idx_shifts_crew_id ON public.shifts(crew_id);
CREATE INDEX idx_shifts_start_time ON public.shifts(start_time);
CREATE INDEX idx_shifts_end_time ON public.shifts(end_time);
CREATE INDEX idx_shifts_status ON public.shifts(status);
CREATE INDEX idx_shifts_project_date ON public.shifts(project_id, start_time);

-- ========================================
-- 12. НАЗНАЧЕНИЯ НА СМЕНЫ
-- ========================================

CREATE TABLE public.shift_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'declined', 'completed')),
  
  -- Timestamps
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Уникальность
  CONSTRAINT unique_shift_assignee UNIQUE (shift_id, employee_id)
);

-- Индексы
CREATE INDEX idx_shift_assignees_shift_id ON public.shift_assignees(shift_id);
CREATE INDEX idx_shift_assignees_employee_id ON public.shift_assignees(employee_id);
CREATE INDEX idx_shift_assignees_status ON public.shift_assignees(status);

-- ========================================
-- 13. СООБЩЕНИЯ ПРОЕКТОВ (ЧАТЫ)
-- ========================================

CREATE TABLE public.project_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID, -- Может быть NULL для системных сообщений
  -- Связь с auth.users или employees
  
  reply_to_id UUID REFERENCES public.project_messages(id) ON DELETE SET NULL,
  -- Ответ на сообщение
  
  -- Содержимое
  content TEXT NOT NULL,
  
  -- Тип сообщения
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file', 'image')),
  
  -- Метаданные
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Прочитано
  read_by UUID[], -- Массив ID пользователей, которые прочитали
  
  -- Дополнительные данные
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_project_messages_project_id ON public.project_messages(project_id);
CREATE INDEX idx_project_messages_user_id ON public.project_messages(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_project_messages_reply_to ON public.project_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_project_messages_created_at ON public.project_messages(created_at DESC);
CREATE INDEX idx_project_messages_type ON public.project_messages(message_type);
CREATE INDEX idx_project_messages_project_date ON public.project_messages(project_id, created_at DESC);
CREATE INDEX idx_project_messages_read_by ON public.project_messages USING gin(read_by);
CREATE INDEX idx_project_messages_search ON public.project_messages USING gin(to_tsvector('russian', content));

-- ========================================
-- 14. ВЛОЖЕНИЯ К СООБЩЕНИЯМ
-- ========================================

CREATE TABLE public.message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  message_id UUID NOT NULL REFERENCES public.project_messages(id) ON DELETE CASCADE,
  
  -- Информация о файле
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Превью для изображений
  thumbnail_url TEXT,
  
  -- Дополнительно
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Индексы
CREATE INDEX idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX idx_message_attachments_created_at ON public.message_attachments(created_at DESC);

-- ========================================
-- 15. ПОЛЬЗОВАТЕЛЬСКИЕ КАТЕГОРИИ ЗАТРАТ
-- ========================================

CREATE TABLE public.custom_expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  name VARCHAR(100) NOT NULL,
  
  -- Связь с проектом (NULL = глобальная категория)
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Дополнительно
  description TEXT,
  color VARCHAR(7), -- HEX цвет, например #FF5733
  icon VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Уникальность
  CONSTRAINT unique_custom_category UNIQUE (name, project_id)
);

-- Индексы
CREATE INDEX idx_custom_categories_project_id ON public.custom_expense_categories(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_custom_categories_name ON public.custom_expense_categories(name);

-- ========================================
-- ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ
-- ========================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггер к таблицам с updated_at
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER task_comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER crews_updated_at BEFORE UPDATE ON public.crews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER shifts_updated_at BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER project_messages_updated_at BEFORE UPDATE ON public.project_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ТРИГГЕР: Автоматический расчет фактических затрат проекта
-- ========================================

CREATE OR REPLACE FUNCTION update_project_actual_cost()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.projects
  SET actual_cost = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM public.invoices
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_update_project_cost
  AFTER INSERT OR UPDATE OF total_amount OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_project_actual_cost();

-- ========================================
-- ТРИГГЕР: Обновление статистики поставщиков
-- ========================================

CREATE OR REPLACE FUNCTION update_supplier_stats()
RETURNS TRIGGER AS $$
DECLARE
  supplier_rec RECORD;
BEGIN
  -- Находим поставщика по имени или ИНН
  SELECT id INTO supplier_rec
  FROM public.suppliers
  WHERE name = COALESCE(NEW.supplier_name, OLD.supplier_name)
     OR inn = COALESCE(NEW.supplier_inn, OLD.supplier_inn)
  LIMIT 1;
  
  IF supplier_rec.id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.suppliers
      SET 
        total_orders = total_orders + 1,
        total_amount = total_amount + NEW.total_amount,
        last_order_date = NEW.issue_date
      WHERE id = supplier_rec.id;
    ELSIF TG_OP = 'UPDATE' THEN
      UPDATE public.suppliers
      SET total_amount = total_amount - OLD.total_amount + NEW.total_amount
      WHERE id = supplier_rec.id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.suppliers
      SET 
        total_orders = GREATEST(0, total_orders - 1),
        total_amount = GREATEST(0, total_amount - OLD.total_amount)
      WHERE id = supplier_rec.id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_update_supplier_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_stats();

-- ========================================
-- ТРИГГЕР: Завершение задачи
-- ========================================

CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at = NOW();
    NEW.progress_percent = 100;
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_set_completed_at
  BEFORE UPDATE OF status ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();

-- ========================================
-- ТРИГГЕР: Обновление счетчиков подзадач
-- ========================================

CREATE OR REPLACE FUNCTION update_parent_task_subtasks_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.parent_task_id IS NOT NULL THEN
      UPDATE public.tasks
      SET 
        subtasks_count = (
          SELECT COUNT(*)
          FROM public.tasks
          WHERE parent_task_id = NEW.parent_task_id
        ),
        subtasks_completed_count = (
          SELECT COUNT(*)
          FROM public.tasks
          WHERE parent_task_id = NEW.parent_task_id
            AND status = 'done'
        )
      WHERE id = NEW.parent_task_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_task_id IS NOT NULL THEN
      UPDATE public.tasks
      SET 
        subtasks_count = GREATEST(0, subtasks_count - 1),
        subtasks_completed_count = CASE 
          WHEN OLD.status = 'done' THEN GREATEST(0, subtasks_completed_count - 1)
          ELSE subtasks_completed_count
        END
      WHERE id = OLD.parent_task_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_update_parent_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_task_subtasks_count();

-- ========================================
-- ТРИГГЕР: Обновление счетчика комментариев
-- ========================================

CREATE OR REPLACE FUNCTION update_task_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tasks
    SET comments_count = comments_count + 1
    WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tasks
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.task_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_comments_count_trigger
  AFTER INSERT OR DELETE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comments_count();

-- ========================================
-- ТРИГГЕР: Обновление счетчика вложений
-- ========================================

CREATE OR REPLACE FUNCTION update_task_attachments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tasks
    SET attachments_count = attachments_count + 1
    WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tasks
    SET attachments_count = GREATEST(0, attachments_count - 1)
    WHERE id = OLD.task_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_attachments_count_trigger
  AFTER INSERT OR DELETE ON public.task_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_attachments_count();

-- ========================================
-- ТРИГГЕР: Обновление счетчика членов бригады
-- ========================================

CREATE OR REPLACE FUNCTION update_crew_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.crews
    SET members_count = members_count + 1
    WHERE id = NEW.crew_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.crews
    SET members_count = GREATEST(0, members_count - 1)
    WHERE id = OLD.crew_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crew_members_count_trigger
  AFTER INSERT OR DELETE ON public.crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_members_count();

-- ========================================
-- ТРИГГЕР: Обновление счетчика назначенных на смену
-- ========================================

CREATE OR REPLACE FUNCTION update_shift_assignees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shifts
    SET assignees_count = assignees_count + 1
    WHERE id = NEW.shift_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shifts
    SET assignees_count = GREATEST(0, assignees_count - 1)
    WHERE id = OLD.shift_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shift_assignees_count_trigger
  AFTER INSERT OR DELETE ON public.shift_assignees
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_assignees_count();

-- ========================================
-- ТРИГГЕР: Автоматическая привязка счета к поставщику по ИНН
-- ========================================

CREATE OR REPLACE FUNCTION link_invoice_to_supplier()
RETURNS TRIGGER AS $$
DECLARE
  found_supplier_id UUID;
BEGIN
  IF NEW.supplier_id IS NULL AND NEW.supplier_inn IS NOT NULL THEN
    SELECT id INTO found_supplier_id
    FROM public.suppliers
    WHERE inn = NEW.supplier_inn
      AND is_active = true
    LIMIT 1;
    
    IF found_supplier_id IS NOT NULL THEN
      NEW.supplier_id = found_supplier_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_link_supplier
  BEFORE INSERT OR UPDATE OF supplier_inn ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION link_invoice_to_supplier();

-- ========================================
-- ТРИГГЕР: Автоматическая проверка статуса оплаты
-- ========================================

CREATE OR REPLACE FUNCTION check_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Если оплачено полностью
  IF NEW.paid_amount >= NEW.total_amount THEN
    NEW.payment_status = 'paid';
    IF NEW.payment_date IS NULL THEN
      NEW.payment_date = CURRENT_DATE;
    END IF;
  -- Если частично оплачено
  ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
    NEW.payment_status = 'partially_paid';
  -- Если просрочен
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.paid_amount < NEW.total_amount THEN
    NEW.payment_status = 'overdue';
  -- Иначе ожидает оплаты
  ELSIF NEW.paid_amount = 0 THEN
    NEW.payment_status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_check_payment_status
  BEFORE INSERT OR UPDATE OF paid_amount, total_amount, due_date ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_payment_status();

-- ========================================
-- ГОТОВО!
-- ========================================

-- Вывод информации о созданных таблицах
DO $$ 
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
  RAISE NOTICE '========================================';
  RAISE NOTICE 'СХЕМА БАЗЫ ДАННЫХ УСПЕШНО СОЗДАНА!';
  RAISE NOTICE 'Создано таблиц: %', table_count;
  RAISE NOTICE '========================================';
END $$;
