-- ========================================
-- ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ CRM ДЛЯ ОСТЕКЛЕНИЯ
-- Версия: 2.0
-- Дата: 2025-10-12
-- ========================================

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- УДАЛЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ
-- ОСТОРОЖНО! Это удалит все данные!
-- ========================================

-- Отключаем триггеры для каскадного удаления
SET session_replication_role = 'replica';

-- Удаляем таблицы в правильном порядке (от зависимых к независимым)
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.project_messages CASCADE;
DROP TABLE IF EXISTS public.task_attachments CASCADE;
DROP TABLE IF EXISTS public.task_comments CASCADE;
DROP TABLE IF EXISTS public.shift_assignees CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.crew_members CASCADE;
DROP TABLE IF EXISTS public.crews CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.custom_expense_categories CASCADE;

-- Включаем триггеры обратно
SET session_replication_role = DEFAULT;

-- ========================================
-- 1. ТАБЛИЦА КЛИЕНТОВ
-- ========================================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Тип клиента
  type VARCHAR(20) NOT NULL CHECK (type IN ('individual', 'company')),
  
  -- Для физических лиц
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  middle_name VARCHAR(100),
  
  -- Для юридических лиц
  company_name VARCHAR(255),
  inn VARCHAR(12),
  kpp VARCHAR(9),
  ogrn VARCHAR(15),
  legal_address TEXT,
  actual_address TEXT,
  
  -- Контактная информация
  phone VARCHAR(50),
  email VARCHAR(255),
  additional_phones TEXT[], -- Массив дополнительных телефонов
  additional_emails TEXT[], -- Массив дополнительных email
  
  -- Контактное лицо (для юр.лиц)
  contact_person VARCHAR(255),
  contact_person_position VARCHAR(100),
  contact_person_phone VARCHAR(50),
  contact_person_email VARCHAR(255),
  
  -- Дополнительная информация
  notes TEXT,
  source VARCHAR(100),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Документы
  documents JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для clients
CREATE INDEX idx_clients_last_name ON public.clients(last_name) WHERE last_name IS NOT NULL;
CREATE INDEX idx_clients_first_name ON public.clients(first_name) WHERE first_name IS NOT NULL;
CREATE INDEX idx_clients_company_name ON public.clients(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;
CREATE INDEX idx_clients_phone ON public.clients(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_clients_inn ON public.clients(inn) WHERE inn IS NOT NULL;
CREATE INDEX idx_clients_type ON public.clients(type);
CREATE INDEX idx_clients_source ON public.clients(source) WHERE source IS NOT NULL;
CREATE INDEX idx_clients_rating ON public.clients(rating) WHERE rating IS NOT NULL;

-- ========================================
-- 2. ТАБЛИЦА СОТРУДНИКОВ
-- ========================================

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация (ФИО раздельно)
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  position VARCHAR(200) NOT NULL,
  department VARCHAR(100),
  
  -- Контактная информация
  phone VARCHAR(50),
  phone_personal VARCHAR(50),
  email VARCHAR(255),
  email_personal VARCHAR(255),
  address TEXT,
  
  -- Роль в системе
  role VARCHAR(20) NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'installer', 'worker', 'accountant', 'storekeeper')),
  permissions JSONB,
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  employment_status VARCHAR(20) DEFAULT 'active' CHECK (employment_status IN ('active', 'vacation', 'sick_leave', 'dismissed', 'probation')),
  
  -- Трудоустройство
  hire_date DATE,
  dismissal_date DATE,
  employment_type VARCHAR(20) CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'freelance')),
  
  -- Финансы
  salary NUMERIC(12, 2),
  salary_currency VARCHAR(3) DEFAULT 'RUB',
  salary_type VARCHAR(20) CHECK (salary_type IN ('fixed', 'hourly', 'project_based')),
  bank_account VARCHAR(20),
  bank_name VARCHAR(255),
  
  -- Документы
  passport_series VARCHAR(10),
  passport_number VARCHAR(20),
  passport_issued_by TEXT,
  passport_issue_date DATE,
  inn VARCHAR(12),
  snils VARCHAR(14),
  
  -- Личные данные
  birth_date DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  marital_status VARCHAR(20),
  
  -- Образование и квалификация
  education VARCHAR(100),
  specialization VARCHAR(200),
  certifications TEXT[],
  skills TEXT[],
  experience_years INTEGER,
  
  -- Внешний вид
  avatar_url TEXT,
  photo_url TEXT,
  
  -- Связь с auth.users
  auth_user_id UUID,
  
  -- Менеджер/руководитель
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Рабочий график
  work_schedule JSONB,
  timezone VARCHAR(50) DEFAULT 'Europe/Moscow',
  
  -- Статистика
  projects_count INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  avg_task_rating NUMERIC(3, 2),
  last_active_at TIMESTAMP WITH TIME ZONE,
  
  -- Дополнительная информация
  notes TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relation VARCHAR(50),
  custom_fields JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_employee_dates CHECK (dismissal_date IS NULL OR hire_date IS NULL OR dismissal_date >= hire_date)
);

-- Индексы для employees
CREATE INDEX idx_employees_last_name ON public.employees(last_name);
CREATE INDEX idx_employees_first_name ON public.employees(first_name);
CREATE INDEX idx_employees_position ON public.employees(position);
CREATE INDEX idx_employees_role ON public.employees(role);
CREATE INDEX idx_employees_is_active ON public.employees(is_active);
CREATE INDEX idx_employees_employment_status ON public.employees(employment_status);
CREATE INDEX idx_employees_email ON public.employees(email) WHERE email IS NOT NULL;
CREATE INDEX idx_employees_phone ON public.employees(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_employees_department ON public.employees(department) WHERE department IS NOT NULL;
CREATE INDEX idx_employees_auth_user_id ON public.employees(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_employees_manager_id ON public.employees(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_employees_active ON public.employees(is_active, employment_status, role) WHERE is_active = true;
CREATE INDEX idx_employees_search ON public.employees USING gin(to_tsvector('russian', last_name || ' ' || first_name || ' ' || COALESCE(middle_name, '') || ' ' || COALESCE(position, '') || ' ' || COALESCE(department, '') || ' ' || COALESCE(email, '')));
CREATE INDEX idx_employees_skills ON public.employees USING gin(skills);
CREATE INDEX idx_employees_certifications ON public.employees USING gin(certifications);

-- ========================================
-- 3. ТАБЛИЦА ПРОЕКТОВ
-- ========================================

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  name VARCHAR(255) NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  
  -- Сроки и бюджет
  start_date DATE,
  end_date DATE,
  actual_end_date DATE,
  budget NUMERIC(15, 2) CHECK (budget IS NULL OR budget >= 0),
  actual_cost NUMERIC(15, 2) CHECK (actual_cost IS NULL OR actual_cost >= 0),
  
  -- Менеджер проекта
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Дополнительная информация
  description TEXT,
  notes TEXT,
  contract_number VARCHAR(100),
  contract_date DATE,
  warranty_period INTEGER, -- В месяцах
  warranty_end_date DATE,
  
  -- Метрики
  area_sqm NUMERIC(10, 2),
  floor_count INTEGER,
  window_count INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_project_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Индексы для projects
CREATE INDEX idx_projects_name ON public.projects(name);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_manager_id ON public.projects(manager_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX idx_projects_end_date ON public.projects(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX idx_projects_active_end ON public.projects(status, end_date) WHERE status IN ('planning', 'in_progress');

-- ========================================
-- 4. ТАБЛИЦА ПОСТАВЩИКОВ
-- ========================================

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  name VARCHAR(255) NOT NULL,
  full_name TEXT,
  inn VARCHAR(12) UNIQUE,
  kpp VARCHAR(9),
  ogrn VARCHAR(15),
  
  -- Категория затрат
  category VARCHAR(50) NOT NULL DEFAULT 'additional' CHECK (category IN (
    'profile', 'components', 'fittings', 'glass', 'glass_units', 
    'sealants', 'materials', 'manufacturing', 'design', 'delivery',
    'lifting_equipment', 'brackets', 'hardware', 'adjoining', 
    'installation', 'additional', 'custom'
  )),
  
  -- Контактная информация
  phone VARCHAR(50),
  phone_additional VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- Адреса
  legal_address TEXT,
  actual_address TEXT,
  warehouse_address TEXT,
  
  -- Контактное лицо
  contact_person VARCHAR(255),
  contact_person_position VARCHAR(100),
  contact_person_phone VARCHAR(50),
  contact_person_email VARCHAR(255),
  
  -- Банковские реквизиты
  bank_name VARCHAR(255),
  bank_bik VARCHAR(9),
  bank_account VARCHAR(20),
  bank_correspondent_account VARCHAR(20),
  
  -- Условия работы
  payment_terms VARCHAR(100),
  delivery_terms TEXT,
  min_order_amount NUMERIC(12, 2),
  discount_percent NUMERIC(5, 2) CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)),
  credit_limit NUMERIC(15, 2),
  
  -- Рейтинг и статус
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  
  -- Статистика
  total_orders INTEGER DEFAULT 0,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  last_order_date DATE,
  
  -- Дополнительная информация
  description TEXT,
  tags TEXT[],
  notes TEXT,
  documents JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для suppliers
CREATE INDEX idx_suppliers_name ON public.suppliers(name);
CREATE INDEX idx_suppliers_inn ON public.suppliers(inn) WHERE inn IS NOT NULL;
CREATE INDEX idx_suppliers_category ON public.suppliers(category);
CREATE INDEX idx_suppliers_is_active ON public.suppliers(is_active);
CREATE INDEX idx_suppliers_priority ON public.suppliers(priority DESC);
CREATE INDEX idx_suppliers_search ON public.suppliers USING gin(to_tsvector('russian', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_suppliers_tags ON public.suppliers USING gin(tags);
CREATE INDEX idx_suppliers_active_category ON public.suppliers(is_active, category) WHERE is_active = true;

-- ========================================
-- 5. ТАБЛИЦА СЧЕТОВ
-- ========================================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связи
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  
  -- Информация о поставщике
  supplier_name VARCHAR(255) NOT NULL,
  supplier_inn VARCHAR(12),
  supplier_kpp VARCHAR(9),
  supplier_address TEXT,
  
  -- Реквизиты счета
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE,
  issue_date DATE NOT NULL,
  due_date DATE,
  payment_date DATE,
  
  -- Суммы
  subtotal_amount NUMERIC(15, 2) CHECK (subtotal_amount IS NULL OR subtotal_amount >= 0),
  vat_rate NUMERIC(5, 2) CHECK (vat_rate IS NULL OR vat_rate IN (0, 10, 20)),
  vat_amount NUMERIC(15, 2) CHECK (vat_amount IS NULL OR vat_amount >= 0),
  total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
  has_vat BOOLEAN DEFAULT true,
  currency VARCHAR(3) DEFAULT 'RUB',
  
  -- Категоризация
  category VARCHAR(50) NOT NULL DEFAULT 'additional' CHECK (category IN (
    'profile', 'components', 'fittings', 'glass', 'glass_units', 
    'sealants', 'materials', 'manufacturing', 'design', 'delivery',
    'lifting_equipment', 'brackets', 'hardware', 'adjoining', 
    'installation', 'additional', 'custom'
  )),
  subcategory VARCHAR(100),
  
  -- Статус оплаты
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  paid_amount NUMERIC(15, 2) DEFAULT 0 CHECK (paid_amount >= 0),
  
  -- Файлы и OCR
  file_url TEXT,
  original_file_name VARCHAR(500),
  file_size INTEGER,
  file_mime_type VARCHAR(100),
  
  ocr_status VARCHAR(20) DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'manual')),
  ocr_confidence NUMERIC(5, 2),
  ocr_raw_text TEXT,
  ocr_data JSONB,
  
  -- Дополнительная информация
  description TEXT,
  items JSONB,
  notes TEXT,
  tags TEXT[],
  
  -- Договор
  contract_number VARCHAR(100),
  contract_date DATE,
  
  -- Доставка
  delivery_date DATE,
  delivery_address TEXT,
  
  -- Ответственные
  responsible_person_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Метаданные
  is_recurring BOOLEAN DEFAULT false,
  recurrence_period VARCHAR(20),
  parent_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_invoice_amounts CHECK (paid_amount <= total_amount),
  CONSTRAINT chk_invoice_dates CHECK (
    (due_date IS NULL OR issue_date IS NULL OR due_date >= issue_date) AND
    (payment_date IS NULL OR issue_date IS NULL OR payment_date >= issue_date)
  )
);

-- Индексы для invoices
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_supplier_id ON public.invoices(supplier_id);
CREATE INDEX idx_invoices_supplier_name ON public.invoices(supplier_name);
CREATE INDEX idx_invoices_supplier_inn ON public.invoices(supplier_inn) WHERE supplier_inn IS NOT NULL;
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date DESC);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_invoices_payment_status ON public.invoices(payment_status);
CREATE INDEX idx_invoices_category ON public.invoices(category);
CREATE INDEX idx_invoices_ocr_status ON public.invoices(ocr_status);
CREATE INDEX idx_invoices_unpaid ON public.invoices(project_id, payment_status, due_date) WHERE payment_status IN ('pending', 'partially_paid', 'overdue');
CREATE INDEX idx_invoices_date_category ON public.invoices(issue_date, category, project_id);
CREATE INDEX idx_invoices_ocr_search ON public.invoices USING gin(to_tsvector('russian', COALESCE(ocr_raw_text, '') || ' ' || COALESCE(description, '')));
CREATE INDEX idx_invoices_ocr_data ON public.invoices USING gin(ocr_data);
CREATE INDEX idx_invoices_items ON public.invoices USING gin(items);
CREATE INDEX idx_invoices_tags ON public.invoices USING gin(tags);

-- ========================================
-- 6. ТАБЛИЦА ЗАДАЧ
-- ========================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Связи
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  
  -- Статус и приоритет
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done')),
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  
  -- Назначение
  assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Даты
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Оценка времени
  estimated_hours NUMERIC(10, 2) CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
  actual_hours NUMERIC(10, 2) CHECK (actual_hours IS NULL OR actual_hours >= 0),
  
  -- Зависимости
  depends_on_task_ids UUID[],
  blocks_task_ids UUID[],
  
  -- Категоризация
  labels TEXT[],
  task_type VARCHAR(50),
  
  -- Локация
  location TEXT,
  coordinates JSONB,
  
  -- Чеклисты
  checklist JSONB,
  
  -- Повторяющиеся задачи
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule VARCHAR(100),
  recurrence_end_date DATE,
  
  -- Прогресс
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  
  -- Метрики
  comments_count INTEGER DEFAULT 0,
  attachments_count INTEGER DEFAULT 0,
  subtasks_count INTEGER DEFAULT 0,
  subtasks_completed_count INTEGER DEFAULT 0,
  
  -- Уведомления
  notify_assignee BOOLEAN DEFAULT true,
  notify_before_hours INTEGER,
  
  -- Дополнительная информация
  notes TEXT,
  custom_fields JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_task_dates CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);

-- Индексы для tasks
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_creator_id ON public.tasks(creator_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_parent_id ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_assignee_active ON public.tasks(assignee_id, status, priority) WHERE status NOT IN ('done') AND assignee_id IS NOT NULL;
CREATE INDEX idx_tasks_project_status ON public.tasks(project_id, status, due_date);
CREATE INDEX idx_tasks_search ON public.tasks USING gin(to_tsvector('russian', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_tasks_labels ON public.tasks USING gin(labels);
CREATE INDEX idx_tasks_depends_on ON public.tasks USING gin(depends_on_task_ids);
CREATE INDEX idx_tasks_blocks ON public.tasks USING gin(blocks_task_ids);
CREATE INDEX idx_tasks_checklist ON public.tasks USING gin(checklist);

-- Продолжение следует в следующем файле...
