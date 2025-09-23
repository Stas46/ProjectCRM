-- Сначала удаляем все политики доступа (RLS)
DROP POLICY IF EXISTS "Users can view projects they created or are assigned to tasks" ON public.projects;
-- Удаляем все другие возможные политики на таблице projects
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN (
        SELECT policyname FROM pg_policies WHERE tablename = 'projects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', policy_name);
    END LOOP;
END
$$;

-- Затем используем CASCADE для удаления всех таблиц вместе с зависимыми объектами
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.crews CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.crew_members CASCADE;
DROP TABLE IF EXISTS public.shift_assignees CASCADE;
DROP TABLE IF EXISTS public.task_comments CASCADE;
DROP TABLE IF EXISTS public.task_attachments CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

-- Таблица для проектов
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planning', 'active', 'on_hold', 'done', 'cancelled')),
    description TEXT,
    due_date DATE,
    budget NUMERIC(12, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для сотрудников
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для бригад/экипажей
CREATE TABLE IF NOT EXISTS public.crews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для задач
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done')),
    priority INTEGER NOT NULL CHECK (priority IN (1, 2, 3)),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для счетов
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    vendor TEXT NOT NULL,
    number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'to_pay', 'paid', 'rejected')),
    category TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для смен в календаре
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для членов бригад
CREATE TABLE IF NOT EXISTS public.crew_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crew_id UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (crew_id, employee_id)
);

-- Таблица для назначения сотрудников на смены
CREATE TABLE IF NOT EXISTS public.shift_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (shift_id, employee_id)
);

-- Таблица для комментариев к задачам
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для вложений к задачам
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создаем индексы для повышения производительности
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_shifts_project_id ON public.shifts(project_id);
CREATE INDEX IF NOT EXISTS idx_shifts_crew_id ON public.shifts(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_crew_id ON public.crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_employee_id ON public.crew_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignees_shift_id ON public.shift_assignees(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignees_employee_id ON public.shift_assignees(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);

-- Создаем триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_modtime
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_employees_modtime
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_crews_modtime
BEFORE UPDATE ON public.crews
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_tasks_modtime
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_invoices_modtime
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_shifts_modtime
BEFORE UPDATE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_task_comments_modtime
BEFORE UPDATE ON public.task_comments
FOR EACH ROW EXECUTE FUNCTION update_modified_column();