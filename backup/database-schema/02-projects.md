# 🏗️ Таблица: PROJECTS (Проекты)

## 📋 Описание
Основная таблица системы. Содержит информацию о проектах остекления.

## 🗃️ Структура таблицы

```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  title VARCHAR(255) NOT NULL,
  -- Название проекта
  
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  -- Связь с клиентом (новое поле!)
  
  client VARCHAR(255),
  -- DEPRECATED: старое поле, оставлено для совместимости
  -- Используйте client_id вместо этого
  
  address TEXT NOT NULL,
  -- Адрес объекта
  
  status VARCHAR(20) NOT NULL DEFAULT 'planning',
  -- Статус проекта
  -- planning - планирование
  -- active - в работе
  -- on_hold - приостановлен
  -- done - завершен
  -- cancelled - отменен
  
  -- Сроки и бюджет
  start_date DATE,
  -- Дата начала работ
  
  due_date DATE,
  -- Плановая дата завершения
  
  actual_end_date DATE,
  -- Фактическая дата завершения
  
  budget NUMERIC(15, 2),
  -- Плановый бюджет
  
  actual_cost NUMERIC(15, 2),
  -- Фактические затраты (считается автоматически из invoices)
  
  -- Менеджер проекта
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  -- ID менеджера проекта
  
  -- Дополнительная информация
  description TEXT,
  -- Подробное описание проекта
  
  notes TEXT,
  -- Заметки, важная информация
  
  contract_number VARCHAR(100),
  -- Номер договора
  
  contract_date DATE,
  -- Дата договора
  
  warranty_period INTEGER,
  -- Гарантийный период (в месяцах)
  
  warranty_end_date DATE,
  -- Дата окончания гарантии
  
  -- Метрики
  area_sqm NUMERIC(10, 2),
  -- Площадь остекления (м²)
  
  floor_count INTEGER,
  -- Количество этажей
  
  window_count INTEGER,
  -- Количество окон
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_status CHECK (status IN ('planning', 'active', 'on_hold', 'done', 'cancelled')),
  CONSTRAINT chk_dates CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date),
  CONSTRAINT chk_budget CHECK (budget IS NULL OR budget >= 0),
  CONSTRAINT chk_cost CHECK (actual_cost IS NULL OR actual_cost >= 0)
);
```

## 📊 Индексы

```sql
-- Поиск по названию
CREATE INDEX idx_projects_title ON public.projects(title);

-- Фильтр по статусу (самый частый запрос)
CREATE INDEX idx_projects_status ON public.projects(status);

-- Фильтр по клиенту
CREATE INDEX idx_projects_client_id ON public.projects(client_id);

-- Фильтр по менеджеру
CREATE INDEX idx_projects_manager_id ON public.projects(manager_id);

-- Сортировка по дате создания
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- Поиск по сроку сдачи
CREATE INDEX idx_projects_due_date ON public.projects(due_date) WHERE due_date IS NOT NULL;

-- Составной индекс для активных проектов с дедлайном
CREATE INDEX idx_projects_active_due ON public.projects(status, due_date) 
  WHERE status IN ('planning', 'active');
```

## 🔗 Связи

### Исходящие связи (от projects)
- `tasks` - Задачи проекта (1:N)
- `invoices` - Счета проекта (1:N)
- `shifts` - Смены по проекту (1:N)
- `project_messages` - Сообщения чата (1:N)

### Входящие связи (к projects)
- `clients` - Клиент проекта (N:1)
- `employees` - Менеджер проекта (N:1)

## 📝 Примеры использования

### Создание нового проекта
```sql
INSERT INTO public.projects (
  title, client_id, address, status, 
  start_date, due_date, budget, 
  manager_id, description, 
  area_sqm, window_count, contract_number
) VALUES (
  'Остекление балкона в ЖК "Солнечный"',
  'client-uuid-here',
  'г. Москва, ул. Солнечная, д. 15, кв. 42',
  'planning',
  '2025-10-20',
  '2025-10-25',
  85000.00,
  'manager-uuid-here',
  'Остекление балкона 6м, теплое остекление, профиль Rehau',
  6.0,
  3,
  'Д-2025-0123'
);
```

### Обновление статуса и фактической даты
```sql
UPDATE public.projects
SET 
  status = 'done',
  actual_end_date = CURRENT_DATE,
  updated_at = NOW()
WHERE id = 'project-uuid-here';
```

### Выборка активных проектов с просроченным дедлайном
```sql
SELECT 
  p.id,
  p.title,
  p.address,
  p.due_date,
  c.name as client_name,
  e.name as manager_name
FROM public.projects p
LEFT JOIN public.clients c ON p.client_id = c.id
LEFT JOIN public.employees e ON p.manager_id = e.id
WHERE p.status IN ('planning', 'active')
  AND p.due_date < CURRENT_DATE
ORDER BY p.due_date ASC;
```

## 🎯 Поля для TypeScript

```typescript
export interface Project {
  id: string;
  title: string;
  client_id?: string;
  client?: string; // DEPRECATED
  address: string;
  status: 'planning' | 'active' | 'on_hold' | 'done' | 'cancelled';
  
  // Даты
  start_date?: string;
  due_date?: string;
  actual_end_date?: string;
  
  // Финансы
  budget?: number;
  actual_cost?: number;
  
  // Менеджер
  manager_id?: string;
  
  // Дополнительно
  description?: string;
  notes?: string;
  contract_number?: string;
  contract_date?: string;
  warranty_period?: number;
  warranty_end_date?: string;
  
  // Метрики
  area_sqm?: number;
  floor_count?: number;
  window_count?: number;
  
  created_at: string;
  updated_at?: string;
  
  // Связанные данные (для JOIN запросов)
  client_data?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  manager_data?: {
    id: string;
    name: string;
    position: string;
  };
}

export type NewProject = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'actual_cost'>;
export type UpdateProject = Partial<NewProject>;
```

## 🔄 Триггеры

```sql
-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Автоматический расчет фактических затрат
CREATE OR REPLACE FUNCTION update_project_actual_cost()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.projects
  SET actual_cost = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM public.invoices
    WHERE project_id = NEW.project_id
  )
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_update_project_cost
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_project_actual_cost();
```

## 📈 Представления (Views)

```sql
-- Проекты с расширенной информацией
CREATE OR REPLACE VIEW projects_extended AS
SELECT 
  p.*,
  c.name as client_name,
  c.phone as client_phone,
  c.email as client_email,
  e.name as manager_name,
  e.position as manager_position,
  COUNT(DISTINCT t.id) as tasks_count,
  COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as tasks_completed,
  COUNT(DISTINCT i.id) as invoices_count,
  COALESCE(SUM(i.total_amount), 0) as total_invoiced,
  COUNT(DISTINCT pm.id) as messages_count
FROM public.projects p
LEFT JOIN public.clients c ON p.client_id = c.id
LEFT JOIN public.employees e ON p.manager_id = e.id
LEFT JOIN public.tasks t ON t.project_id = p.id
LEFT JOIN public.invoices i ON i.project_id = p.id
LEFT JOIN public.project_messages pm ON pm.project_id = p.id
GROUP BY p.id, c.name, c.phone, c.email, e.name, e.position;
```

## 📊 Статистика

```sql
-- Проекты по статусам
SELECT 
  status,
  COUNT(*) as count,
  SUM(budget) as total_budget,
  SUM(actual_cost) as total_cost
FROM public.projects
GROUP BY status
ORDER BY count DESC;

-- Просроченные проекты
SELECT 
  COUNT(*) as overdue_count,
  SUM(budget) as overdue_budget
FROM public.projects
WHERE status IN ('planning', 'active')
  AND due_date < CURRENT_DATE;

-- Средняя продолжительность проекта
SELECT 
  AVG(actual_end_date - start_date) as avg_duration_days
FROM public.projects
WHERE status = 'done'
  AND start_date IS NOT NULL
  AND actual_end_date IS NOT NULL;
```
