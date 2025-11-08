# 👥 Таблица: EMPLOYEES (Сотрудники)

## 📋 Описание
Таблица для управления сотрудниками компании. Включает информацию о должностях, контактах, ролях в системе.

## 🗃️ Структура таблицы

```sql
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  name VARCHAR(255) NOT NULL,
  -- ФИО сотрудника
  
  first_name VARCHAR(100),
  -- Имя
  
  last_name VARCHAR(100),
  -- Фамилия
  
  middle_name VARCHAR(100),
  -- Отчество
  
  position VARCHAR(200) NOT NULL,
  -- Должность
  
  department VARCHAR(100),
  -- Отдел/департамент
  
  -- Контактная информация
  phone VARCHAR(50),
  -- Рабочий телефон
  
  phone_personal VARCHAR(50),
  -- Личный телефон
  
  email VARCHAR(255),
  -- Рабочий email
  
  email_personal VARCHAR(255),
  -- Личный email
  
  -- Адрес
  address TEXT,
  -- Адрес проживания
  
  -- Роль в системе
  role VARCHAR(20) NOT NULL DEFAULT 'worker',
  -- admin - администратор
  -- manager - менеджер
  -- installer - монтажник
  -- worker - рабочий
  -- accountant - бухгалтер
  -- storekeeper - кладовщик
  
  permissions JSONB,
  -- Детальные права доступа в JSON
  -- {"projects": ["read", "write"], "invoices": ["read"], ...}
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  -- Активен ли сотрудник
  
  employment_status VARCHAR(20) DEFAULT 'active',
  -- active - работает
  -- vacation - в отпуске
  -- sick_leave - на больничном
  -- dismissed - уволен
  -- probation - на испытательном сроке
  
  -- Трудоустройство
  hire_date DATE,
  -- Дата приема на работу
  
  dismissal_date DATE,
  -- Дата увольнения
  
  employment_type VARCHAR(20),
  -- full_time - полная занятость
  -- part_time - частичная занятость
  -- contract - по договору
  -- freelance - фриланс
  
  -- Финансы
  salary NUMERIC(12, 2),
  -- Оклад
  
  salary_currency VARCHAR(3) DEFAULT 'RUB',
  -- Валюта зарплаты
  
  salary_type VARCHAR(20),
  -- fixed - фиксированная
  -- hourly - почасовая
  -- project_based - по проектам
  
  bank_account VARCHAR(20),
  -- Номер счета для перечисления зарплаты
  
  bank_name VARCHAR(255),
  -- Название банка
  
  -- Документы
  passport_series VARCHAR(10),
  -- Серия паспорта
  
  passport_number VARCHAR(20),
  -- Номер паспорта
  
  passport_issued_by TEXT,
  -- Кем выдан
  
  passport_issue_date DATE,
  -- Дата выдачи
  
  inn VARCHAR(12),
  -- ИНН
  
  snils VARCHAR(14),
  -- СНИЛС
  
  -- Личные данные
  birth_date DATE,
  -- Дата рождения
  
  gender VARCHAR(10),
  -- male, female, other
  
  marital_status VARCHAR(20),
  -- single, married, divorced, widowed
  
  -- Образование и квалификация
  education VARCHAR(100),
  -- Образование
  
  specialization VARCHAR(200),
  -- Специализация
  
  certifications TEXT[],
  -- Сертификаты и квалификации (массив)
  
  skills TEXT[],
  -- Навыки (массив)
  
  experience_years INTEGER,
  -- Опыт работы в годах
  
  -- Внешний вид
  avatar_url TEXT,
  -- URL аватара
  
  photo_url TEXT,
  -- URL фото для документов
  
  -- Связь с auth.users (если используется Supabase Auth)
  auth_user_id UUID,
  -- ID из auth.users
  
  -- Менеджер/руководитель
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  -- Непосредственный руководитель
  
  -- Рабочий график
  work_schedule JSONB,
  -- График работы в JSON
  -- {"monday": {"start": "09:00", "end": "18:00"}, ...}
  
  timezone VARCHAR(50) DEFAULT 'Europe/Moscow',
  -- Часовой пояс
  
  -- Статистика
  projects_count INTEGER DEFAULT 0,
  -- Количество проектов
  
  tasks_completed INTEGER DEFAULT 0,
  -- Выполненных задач
  
  avg_task_rating NUMERIC(3, 2),
  -- Средняя оценка выполнения задач
  
  last_active_at TIMESTAMP WITH TIME ZONE,
  -- Последняя активность в системе
  
  -- Дополнительная информация
  notes TEXT,
  -- Заметки о сотруднике
  
  emergency_contact_name VARCHAR(255),
  -- Контактное лицо в экстренных случаях
  
  emergency_contact_phone VARCHAR(50),
  -- Телефон экстренного контакта
  
  emergency_contact_relation VARCHAR(50),
  -- Отношение (супруг/супруга, родитель и т.д.)
  
  custom_fields JSONB,
  -- Пользовательские поля
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_role CHECK (role IN ('admin', 'manager', 'installer', 'worker', 'accountant', 'storekeeper')),
  CONSTRAINT chk_employment_status CHECK (employment_status IN ('active', 'vacation', 'sick_leave', 'dismissed', 'probation')),
  CONSTRAINT chk_employment_type CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'freelance')),
  CONSTRAINT chk_salary_type CHECK (salary_type IN ('fixed', 'hourly', 'project_based')),
  CONSTRAINT chk_gender CHECK (gender IN ('male', 'female', 'other')),
  CONSTRAINT chk_dates CHECK (
    (dismissal_date IS NULL OR hire_date IS NULL OR dismissal_date >= hire_date)
  )
);
```

## 📊 Индексы

```sql
-- Поиск по имени
CREATE INDEX idx_employees_name ON public.employees(name);

-- Поиск по должности
CREATE INDEX idx_employees_position ON public.employees(position);

-- Фильтр по роли
CREATE INDEX idx_employees_role ON public.employees(role);

-- Фильтр по статусу
CREATE INDEX idx_employees_is_active ON public.employees(is_active);
CREATE INDEX idx_employees_employment_status ON public.employees(employment_status);

-- Поиск по email
CREATE INDEX idx_employees_email ON public.employees(email) WHERE email IS NOT NULL;

-- Поиск по телефону
CREATE INDEX idx_employees_phone ON public.employees(phone) WHERE phone IS NOT NULL;

-- Поиск по отделу
CREATE INDEX idx_employees_department ON public.employees(department) WHERE department IS NOT NULL;

-- Связь с auth
CREATE INDEX idx_employees_auth_user_id ON public.employees(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Поиск руководителя
CREATE INDEX idx_employees_manager_id ON public.employees(manager_id) WHERE manager_id IS NOT NULL;

-- Составной индекс для активных сотрудников
CREATE INDEX idx_employees_active ON public.employees(is_active, employment_status, role)
  WHERE is_active = true;

-- Полнотекстовый поиск
CREATE INDEX idx_employees_search ON public.employees 
  USING gin(to_tsvector('russian', 
    name || ' ' || 
    COALESCE(position, '') || ' ' || 
    COALESCE(department, '') || ' ' ||
    COALESCE(email, '')
  ));

-- GIN индексы для массивов
CREATE INDEX idx_employees_skills ON public.employees USING gin(skills);
CREATE INDEX idx_employees_certifications ON public.employees USING gin(certifications);
```

## 🔗 Связи

### Исходящие связи (от employees)
- `tasks` (assignee) - Назначенные задачи (1:N)
- `tasks` (creator) - Созданные задачи (1:N)
- `invoices` (responsible_person) - Счета под ответственностью (1:N)
- `invoices` (approved_by) - Одобренные счета (1:N)
- `crew_members` - Членство в бригадах (1:N)
- `shift_assignees` - Назначения на смены (1:N)
- `projects` (manager) - Управляемые проекты (1:N)
- `employees` (subordinates) - Подчиненные (1:N, рекурсивная)

### Входящие связи (к employees)
- `employees` (manager) - Руководитель (N:1, рекурсивная)

## 📝 Примеры использования

### Создание сотрудника
```sql
INSERT INTO public.employees (
  name, first_name, last_name, middle_name,
  position, department, role,
  phone, email,
  hire_date, employment_type, salary, salary_type,
  birth_date, gender,
  skills, certifications
) VALUES (
  'Иванов Иван Иванович',
  'Иван',
  'Иванов',
  'Иванович',
  'Старший монтажник',
  'Монтажный отдел',
  'installer',
  '+7 (999) 123-45-67',
  'ivanov@company.ru',
  '2023-01-15',
  'full_time',
  80000.00,
  'fixed',
  '1985-03-20',
  'male',
  ARRAY['монтаж окон', 'алюминиевые конструкции', 'работа на высоте'],
  ARRAY['Сертификат безопасности при работе на высоте', 'Монтажник 5 разряда']
);
```

### Создание менеджера с подчиненными
```sql
-- Создаем менеджера
INSERT INTO public.employees (
  name, position, department, role,
  phone, email, hire_date, salary
) VALUES (
  'Петров Петр Петрович',
  'Руководитель отдела монтажа',
  'Монтажный отдел',
  'manager',
  '+7 (999) 111-22-33',
  'petrov@company.ru',
  '2020-05-01',
  120000.00
) RETURNING id;

-- Назначаем руководителя существующим сотрудникам
UPDATE public.employees
SET manager_id = 'manager-uuid-here'
WHERE department = 'Монтажный отдел'
  AND role = 'installer';
```

### Обновление статуса сотрудника
```sql
-- Отправить в отпуск
UPDATE public.employees
SET 
  employment_status = 'vacation',
  updated_at = NOW()
WHERE id = 'employee-uuid-here';

-- Вернуть из отпуска
UPDATE public.employees
SET 
  employment_status = 'active',
  updated_at = NOW()
WHERE id = 'employee-uuid-here';
```

### Увольнение сотрудника
```sql
UPDATE public.employees
SET 
  employment_status = 'dismissed',
  is_active = false,
  dismissal_date = CURRENT_DATE,
  updated_at = NOW()
WHERE id = 'employee-uuid-here';
```

### Получение иерархии сотрудников
```sql
WITH RECURSIVE employee_hierarchy AS (
  -- Топ-менеджеры (без руководителя)
  SELECT 
    e.*,
    0 as level,
    ARRAY[e.id] as path,
    e.name as path_names
  FROM public.employees e
  WHERE e.manager_id IS NULL
    AND e.is_active = true
  
  UNION ALL
  
  -- Подчиненные
  SELECT 
    e.*,
    eh.level + 1,
    eh.path || e.id,
    eh.path_names || ' > ' || e.name
  FROM public.employees e
  JOIN employee_hierarchy eh ON e.manager_id = eh.id
  WHERE e.is_active = true
    AND NOT e.id = ANY(eh.path)
)
SELECT 
  id,
  REPEAT('  ', level) || name as indented_name,
  position,
  department,
  role,
  level,
  path_names
FROM employee_hierarchy
ORDER BY path;
```

### Поиск доступных монтажников
```sql
SELECT 
  e.id,
  e.name,
  e.position,
  e.phone,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('todo', 'in_progress')) as active_tasks_count,
  COUNT(DISTINCT sa.shift_id) FILTER (
    WHERE s.start_time >= NOW() 
    AND s.start_time <= NOW() + INTERVAL '7 days'
  ) as upcoming_shifts_count
FROM public.employees e
LEFT JOIN public.tasks t ON t.assignee_id = e.id
LEFT JOIN public.shift_assignees sa ON sa.employee_id = e.id
LEFT JOIN public.shifts s ON s.id = sa.shift_id
WHERE e.role = 'installer'
  AND e.is_active = true
  AND e.employment_status = 'active'
GROUP BY e.id, e.name, e.position, e.phone
HAVING COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('todo', 'in_progress')) < 5
ORDER BY active_tasks_count ASC, upcoming_shifts_count ASC;
```

## 🎯 Поля для TypeScript

```typescript
export interface Employee {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  position: string;
  department?: string;
  
  // Контакты
  phone?: string;
  phone_personal?: string;
  email?: string;
  email_personal?: string;
  address?: string;
  
  // Роль и права
  role: 'admin' | 'manager' | 'installer' | 'worker' | 'accountant' | 'storekeeper';
  permissions?: Record<string, string[]>;
  
  // Статус
  is_active: boolean;
  employment_status: 'active' | 'vacation' | 'sick_leave' | 'dismissed' | 'probation';
  
  // Трудоустройство
  hire_date?: string;
  dismissal_date?: string;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'freelance';
  
  // Финансы
  salary?: number;
  salary_currency: string;
  salary_type?: 'fixed' | 'hourly' | 'project_based';
  bank_account?: string;
  bank_name?: string;
  
  // Документы
  passport_series?: string;
  passport_number?: string;
  passport_issued_by?: string;
  passport_issue_date?: string;
  inn?: string;
  snils?: string;
  
  // Личные данные
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  
  // Квалификация
  education?: string;
  specialization?: string;
  certifications?: string[];
  skills?: string[];
  experience_years?: number;
  
  // Фото
  avatar_url?: string;
  photo_url?: string;
  
  // Связи
  auth_user_id?: string;
  manager_id?: string;
  
  // График
  work_schedule?: Record<string, { start: string; end: string }>;
  timezone: string;
  
  // Статистика
  projects_count: number;
  tasks_completed: number;
  avg_task_rating?: number;
  last_active_at?: string;
  
  // Дополнительно
  notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  custom_fields?: Record<string, any>;
  
  created_at: string;
  updated_at?: string;
  
  // Связанные данные
  manager?: {
    id: string;
    name: string;
    position: string;
  };
  subordinates?: Employee[];
}

export type NewEmployee = Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'projects_count' | 'tasks_completed' | 'avg_task_rating'>;
export type UpdateEmployee = Partial<NewEmployee>;
```

## 🔄 Триггеры

```sql
-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- Автоматическое формирование ФИО
CREATE OR REPLACE FUNCTION generate_employee_full_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
    NEW.name = NEW.last_name || ' ' || NEW.first_name || 
      CASE WHEN NEW.middle_name IS NOT NULL THEN ' ' || NEW.middle_name ELSE '' END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_generate_full_name
  BEFORE INSERT OR UPDATE OF first_name, last_name, middle_name ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION generate_employee_full_name();

-- Автоматическая деактивация при увольнении
CREATE OR REPLACE FUNCTION deactivate_dismissed_employee()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employment_status = 'dismissed' THEN
    NEW.is_active = false;
    IF NEW.dismissal_date IS NULL THEN
      NEW.dismissal_date = CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_auto_deactivate
  BEFORE UPDATE OF employment_status ON public.employees
  FOR EACH ROW
  WHEN (NEW.employment_status = 'dismissed' AND OLD.employment_status != 'dismissed')
  EXECUTE FUNCTION deactivate_dismissed_employee();
```

## 📈 Представления (Views)

```sql
-- Активные сотрудники с полной информацией
CREATE OR REPLACE VIEW employees_active AS
SELECT 
  e.*,
  m.name as manager_name,
  m.position as manager_position,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status NOT IN ('done')) as active_tasks,
  COUNT(DISTINCT p.id) as managed_projects
FROM public.employees e
LEFT JOIN public.employees m ON e.manager_id = m.id
LEFT JOIN public.tasks t ON t.assignee_id = e.id
LEFT JOIN public.projects p ON p.manager_id = e.id
WHERE e.is_active = true
  AND e.employment_status = 'active'
GROUP BY e.id, m.name, m.position;

-- Сотрудники по отделам
CREATE OR REPLACE VIEW employees_by_department AS
SELECT 
  department,
  role,
  COUNT(*) as employees_count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count,
  AVG(salary) FILTER (WHERE salary IS NOT NULL) as avg_salary,
  STRING_AGG(name, ', ' ORDER BY name) as employees_list
FROM public.employees
WHERE department IS NOT NULL
GROUP BY department, role
ORDER BY department, role;
```

## 📊 Статистика

```sql
-- Статистика по сотрудникам
SELECT 
  role,
  COUNT(*) as total,
  COUNT(CASE WHEN is_active THEN 1 END) as active,
  COUNT(CASE WHEN employment_status = 'vacation' THEN 1 END) as on_vacation,
  AVG(salary) FILTER (WHERE salary IS NOT NULL) as avg_salary,
  AVG(experience_years) FILTER (WHERE experience_years IS NOT NULL) as avg_experience
FROM public.employees
GROUP BY role
ORDER BY total DESC;

-- Производительность
SELECT 
  e.id,
  e.name,
  e.position,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') as completed_tasks,
  AVG(t.actual_hours) FILTER (WHERE t.actual_hours IS NOT NULL) as avg_task_hours,
  COUNT(DISTINCT t.project_id) as projects_involved
FROM public.employees e
LEFT JOIN public.tasks t ON t.assignee_id = e.id
WHERE e.is_active = true
  AND t.completed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY e.id, e.name, e.position
ORDER BY completed_tasks DESC;
```

## ✅ Валидация

- `name` - обязательно, максимум 255 символов
- `position` - обязательно, максимум 200 символов
- `role` - обязательно, из списка доступных ролей
- `is_active` - по умолчанию true
- `employment_status` - по умолчанию 'active'
- `dismissal_date` >= hire_date (если оба указаны)
- `email` - должен быть валидный email format
- `salary` >= 0
