# ✅ Таблица: TASKS (Задачи)

## 📋 Описание
Таблица для управления задачами по проектам. Поддерживает статусы, приоритеты, назначение исполнителей, дедлайны.
Задачи могут иметь комментарии и вложения.

## 🗃️ Структура таблицы

```sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  title VARCHAR(500) NOT NULL,
  -- Название задачи
  
  description TEXT,
  -- Подробное описание
  
  -- Связи
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- Проект, к которому относится задача
  
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  -- Родительская задача (для подзадач)
  
  -- Статус и приоритет
  status VARCHAR(20) NOT NULL DEFAULT 'todo',
  -- todo - к выполнению
  -- in_progress - в работе
  -- blocked - заблокирована
  -- review - на проверке
  -- done - выполнена
  
  priority INTEGER NOT NULL DEFAULT 2,
  -- 1 - высокий (срочно и важно)
  -- 2 - средний (обычная задача)
  -- 3 - низкий (можно отложить)
  
  -- Назначение
  assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  -- Исполнитель задачи
  
  creator_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  -- Кто создал задачу
  
  -- Даты
  start_date DATE,
  -- Дата начала работы
  
  due_date DATE,
  -- Срок выполнения
  
  completed_at TIMESTAMP WITH TIME ZONE,
  -- Фактическая дата завершения
  
  -- Оценка времени
  estimated_hours NUMERIC(10, 2),
  -- Оценка времени в часах
  
  actual_hours NUMERIC(10, 2),
  -- Фактически затраченное время
  
  -- Зависимости
  depends_on_task_ids UUID[],
  -- Массив ID задач, от которых зависит эта задача
  
  blocks_task_ids UUID[],
  -- Массив ID задач, которые блокирует эта задача
  
  -- Категоризация
  labels TEXT[],
  -- Метки/теги для группировки
  -- Примеры: ['монтаж', 'срочно', 'материалы']
  
  task_type VARCHAR(50),
  -- Тип задачи (optional, для кастомной категоризации)
  -- Примеры: 'measurement', 'installation', 'delivery', 'documentation'
  
  -- Локация
  location TEXT,
  -- Место выполнения задачи
  
  coordinates JSONB,
  -- GPS координаты в формате {"lat": 55.751244, "lng": 37.618423}
  
  -- Чеклисты
  checklist JSONB,
  -- Чеклист в формате JSON
  -- [{"id": 1, "text": "Подготовить инструменты", "completed": true}, ...]
  
  -- Повторяющиеся задачи
  is_recurring BOOLEAN DEFAULT false,
  -- Повторяющаяся задача
  
  recurrence_rule VARCHAR(100),
  -- Правило повторения (RRULE format или упрощенный)
  -- Примеры: 'WEEKLY', 'MONTHLY', 'EVERY_2_WEEKS'
  
  recurrence_end_date DATE,
  -- Дата окончания повторений
  
  -- Прогресс
  progress_percent INTEGER DEFAULT 0,
  -- Процент выполнения (0-100)
  
  -- Метрики
  comments_count INTEGER DEFAULT 0,
  -- Количество комментариев
  
  attachments_count INTEGER DEFAULT 0,
  -- Количество вложений
  
  subtasks_count INTEGER DEFAULT 0,
  -- Количество подзадач
  
  subtasks_completed_count INTEGER DEFAULT 0,
  -- Количество выполненных подзадач
  
  -- Уведомления
  notify_assignee BOOLEAN DEFAULT true,
  -- Уведомлять исполнителя
  
  notify_before_hours INTEGER,
  -- За сколько часов до дедлайна напомнить
  
  -- Дополнительная информация
  notes TEXT,
  -- Заметки, важная информация
  
  custom_fields JSONB,
  -- Пользовательские поля в JSON
  -- {"field_name": "value", ...}
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_status CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done')),
  CONSTRAINT chk_priority CHECK (priority IN (1, 2, 3)),
  CONSTRAINT chk_progress CHECK (progress_percent >= 0 AND progress_percent <= 100),
  CONSTRAINT chk_dates CHECK (
    (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
  ),
  CONSTRAINT chk_hours CHECK (
    (estimated_hours IS NULL OR estimated_hours >= 0) AND
    (actual_hours IS NULL OR actual_hours >= 0)
  )
);
```

## 📊 Индексы

```sql
-- Поиск по проекту (самый частый)
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);

-- Поиск по исполнителю
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);

-- Поиск по создателю
CREATE INDEX idx_tasks_creator_id ON public.tasks(creator_id);

-- Фильтр по статусу
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- Фильтр по приоритету
CREATE INDEX idx_tasks_priority ON public.tasks(priority);

-- Поиск по дедлайну
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;

-- Поиск родительской задачи
CREATE INDEX idx_tasks_parent_id ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Составной индекс для активных задач исполнителя
CREATE INDEX idx_tasks_assignee_active ON public.tasks(assignee_id, status, priority)
  WHERE status NOT IN ('done') AND assignee_id IS NOT NULL;

-- Составной индекс для задач проекта по статусу
CREATE INDEX idx_tasks_project_status ON public.tasks(project_id, status, due_date);

-- Полнотекстовый поиск
CREATE INDEX idx_tasks_search ON public.tasks 
  USING gin(to_tsvector('russian', title || ' ' || COALESCE(description, '')));

-- GIN индекс для меток
CREATE INDEX idx_tasks_labels ON public.tasks USING gin(labels);

-- GIN индекс для зависимостей
CREATE INDEX idx_tasks_depends_on ON public.tasks USING gin(depends_on_task_ids);
CREATE INDEX idx_tasks_blocks ON public.tasks USING gin(blocks_task_ids);

-- GIN индекс для чеклиста
CREATE INDEX idx_tasks_checklist ON public.tasks USING gin(checklist);
```

## 🔗 Связи

### Входящие связи (к tasks)
- `projects` - Проект (N:1, обязательная)
- `employees` (assignee_id) - Исполнитель (N:1, опциональная)
- `employees` (creator_id) - Создатель (N:1, опциональная)
- `tasks` (parent_task_id) - Родительская задача (N:1, опциональная, рекурсивная)

### Исходящие связи (от tasks)
- `task_comments` - Комментарии к задаче (1:N)
- `task_attachments` - Вложения к задаче (1:N)
- `tasks` (subtasks) - Подзадачи (1:N, рекурсивная)

## 📝 Примеры использования

### Создание простой задачи
```sql
INSERT INTO public.tasks (
  title, description, project_id, assignee_id, creator_id,
  status, priority, due_date, estimated_hours
) VALUES (
  'Замерить балкон',
  'Необходимо сделать точные замеры балкона для расчета материалов',
  'project-uuid-here',
  'employee-uuid-here',
  'creator-uuid-here',
  'todo',
  1,
  '2025-10-15',
  2.0
);
```

### Создание задачи с чеклистом
```sql
INSERT INTO public.tasks (
  title, project_id, assignee_id,
  status, priority, due_date,
  checklist
) VALUES (
  'Подготовка к монтажу',
  'project-uuid-here',
  'employee-uuid-here',
  'in_progress',
  1,
  '2025-10-20',
  '[
    {"id": 1, "text": "Проверить наличие всех материалов", "completed": true},
    {"id": 2, "text": "Подготовить инструменты", "completed": true},
    {"id": 3, "text": "Согласовать время с клиентом", "completed": false},
    {"id": 4, "text": "Оформить пропуск на объект", "completed": false}
  ]'::jsonb
);
```

### Создание подзадачи
```sql
INSERT INTO public.tasks (
  title, project_id, parent_task_id, assignee_id,
  status, priority
) VALUES (
  'Купить крепеж для монтажа',
  'project-uuid-here',
  'parent-task-uuid-here',
  'employee-uuid-here',
  'todo',
  2
);
```

### Обновление прогресса задачи
```sql
UPDATE public.tasks
SET 
  progress_percent = 75,
  actual_hours = 5.5,
  updated_at = NOW()
WHERE id = 'task-uuid-here';
```

### Завершение задачи
```sql
UPDATE public.tasks
SET 
  status = 'done',
  progress_percent = 100,
  completed_at = NOW(),
  updated_at = NOW()
WHERE id = 'task-uuid-here';
```

### Получение задач исполнителя с приоритетом
```sql
SELECT 
  t.*,
  p.title as project_title,
  e.name as assignee_name,
  CASE 
    WHEN t.due_date < CURRENT_DATE THEN 'overdue'
    WHEN t.due_date = CURRENT_DATE THEN 'today'
    WHEN t.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'soon'
    ELSE 'later'
  END as urgency
FROM public.tasks t
JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.employees e ON t.assignee_id = e.id
WHERE t.assignee_id = 'employee-uuid-here'
  AND t.status NOT IN ('done')
ORDER BY 
  CASE urgency
    WHEN 'overdue' THEN 1
    WHEN 'today' THEN 2
    WHEN 'soon' THEN 3
    ELSE 4
  END,
  t.priority ASC,
  t.due_date ASC;
```

### Получение задач с подзадачами
```sql
WITH RECURSIVE task_hierarchy AS (
  -- Корневые задачи
  SELECT 
    t.*,
    0 as level,
    ARRAY[t.id] as path
  FROM public.tasks t
  WHERE t.parent_task_id IS NULL
    AND t.project_id = 'project-uuid-here'
  
  UNION ALL
  
  -- Подзадачи
  SELECT 
    t.*,
    th.level + 1,
    th.path || t.id
  FROM public.tasks t
  JOIN task_hierarchy th ON t.parent_task_id = th.id
  WHERE NOT t.id = ANY(th.path) -- Защита от циклов
)
SELECT 
  *,
  REPEAT('  ', level) || title as indented_title
FROM task_hierarchy
ORDER BY path;
```

## 🎯 Поля для TypeScript

```typescript
export interface Task {
  id: string;
  title: string;
  description?: string;
  
  // Связи
  project_id: string;
  parent_task_id?: string;
  
  // Статус
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 1 | 2 | 3;
  
  // Назначение
  assignee_id?: string;
  creator_id?: string;
  
  // Даты
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  
  // Время
  estimated_hours?: number;
  actual_hours?: number;
  
  // Зависимости
  depends_on_task_ids?: string[];
  blocks_task_ids?: string[];
  
  // Категоризация
  labels?: string[];
  task_type?: string;
  
  // Локация
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  
  // Чеклисты
  checklist?: TaskChecklistItem[];
  
  // Повторение
  is_recurring: boolean;
  recurrence_rule?: string;
  recurrence_end_date?: string;
  
  // Прогресс
  progress_percent: number;
  
  // Метрики
  comments_count: number;
  attachments_count: number;
  subtasks_count: number;
  subtasks_completed_count: number;
  
  // Уведомления
  notify_assignee: boolean;
  notify_before_hours?: number;
  
  // Дополнительно
  notes?: string;
  custom_fields?: Record<string, any>;
  
  created_at: string;
  updated_at?: string;
  
  // Связанные данные
  project?: {
    id: string;
    title: string;
  };
  assignee?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  creator?: {
    id: string;
    name: string;
  };
  parent_task?: {
    id: string;
    title: string;
  };
  subtasks?: Task[];
}

export interface TaskChecklistItem {
  id: number;
  text: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

export type NewTask = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'comments_count' | 'attachments_count' | 'subtasks_count' | 'subtasks_completed_count'>;
export type UpdateTask = Partial<NewTask>;
```

## 🔄 Триггеры

```sql
-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Автоматическая установка completed_at при завершении
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
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

-- Обновление счетчиков подзадач у родительской задачи
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

-- Автоматический расчет прогресса из чеклиста
CREATE OR REPLACE FUNCTION calculate_task_progress_from_checklist()
RETURNS TRIGGER AS $$
DECLARE
  checklist_items INTEGER;
  completed_items INTEGER;
  calculated_progress INTEGER;
BEGIN
  IF NEW.checklist IS NOT NULL AND jsonb_array_length(NEW.checklist) > 0 THEN
    checklist_items := jsonb_array_length(NEW.checklist);
    completed_items := (
      SELECT COUNT(*)
      FROM jsonb_array_elements(NEW.checklist) item
      WHERE (item->>'completed')::boolean = true
    );
    
    calculated_progress := ROUND((completed_items::NUMERIC / checklist_items) * 100);
    NEW.progress_percent := calculated_progress;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_calculate_progress
  BEFORE UPDATE OF checklist ON public.tasks
  FOR EACH ROW
  WHEN (NEW.checklist IS DISTINCT FROM OLD.checklist)
  EXECUTE FUNCTION calculate_task_progress_from_checklist();
```

## 📈 Представления (Views)

```sql
-- Задачи с расширенной информацией
CREATE OR REPLACE VIEW tasks_extended AS
SELECT 
  t.*,
  p.title as project_title,
  p.status as project_status,
  p.client as project_client,
  e1.name as assignee_name,
  e1.position as assignee_position,
  e1.avatar_url as assignee_avatar,
  e2.name as creator_name,
  pt.title as parent_task_title,
  CASE 
    WHEN t.due_date IS NULL THEN NULL
    WHEN t.due_date < CURRENT_DATE AND t.status != 'done' THEN 'overdue'
    WHEN t.due_date = CURRENT_DATE AND t.status != 'done' THEN 'today'
    WHEN t.due_date <= CURRENT_DATE + INTERVAL '3 days' AND t.status != 'done' THEN 'soon'
    ELSE 'later'
  END as urgency,
  CASE 
    WHEN t.status = 'done' THEN NULL
    WHEN t.due_date IS NULL THEN NULL
    ELSE t.due_date - CURRENT_DATE
  END as days_until_due,
  CASE 
    WHEN t.subtasks_count = 0 THEN 100
    ELSE ROUND((t.subtasks_completed_count::NUMERIC / t.subtasks_count) * 100)
  END as subtasks_progress
FROM public.tasks t
JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.employees e1 ON t.assignee_id = e1.id
LEFT JOIN public.employees e2 ON t.creator_id = e2.id
LEFT JOIN public.tasks pt ON t.parent_task_id = pt.id;

-- Просроченные задачи
CREATE OR REPLACE VIEW tasks_overdue AS
SELECT 
  t.*,
  p.title as project_title,
  e.name as assignee_name,
  CURRENT_DATE - t.due_date as days_overdue
FROM public.tasks t
JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.employees e ON t.assignee_id = e.id
WHERE t.status NOT IN ('done')
  AND t.due_date < CURRENT_DATE
ORDER BY t.due_date ASC, t.priority ASC;

-- Задачи без исполнителя
CREATE OR REPLACE VIEW tasks_unassigned AS
SELECT 
  t.*,
  p.title as project_title
FROM public.tasks t
JOIN public.projects p ON t.project_id = p.id
WHERE t.assignee_id IS NULL
  AND t.status NOT IN ('done')
ORDER BY t.priority ASC, t.due_date ASC NULLS LAST;
```

## 📊 Статистика

```sql
-- Статистика по проекту
SELECT 
  project_id,
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_tasks,
  COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'done' THEN 1 END) as overdue_tasks,
  AVG(progress_percent) as avg_progress,
  SUM(estimated_hours) as total_estimated_hours,
  SUM(actual_hours) as total_actual_hours
FROM public.tasks
WHERE project_id = 'project-uuid-here'
GROUP BY project_id;

-- Статистика по исполнителям
SELECT 
  e.id,
  e.name,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as active_tasks,
  COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'done' THEN 1 END) as overdue_tasks,
  AVG(t.progress_percent) as avg_progress
FROM public.employees e
LEFT JOIN public.tasks t ON t.assignee_id = e.id AND t.status != 'done'
WHERE e.is_active = true
GROUP BY e.id, e.name
ORDER BY active_tasks DESC;

-- Анализ продуктивности
SELECT 
  assignee_id,
  e.name,
  COUNT(*) as completed_tasks,
  AVG(actual_hours) as avg_hours_per_task,
  SUM(actual_hours) as total_hours,
  AVG(actual_hours - estimated_hours) as avg_time_deviation
FROM public.tasks t
LEFT JOIN public.employees e ON t.assignee_id = e.id
WHERE t.status = 'done'
  AND t.completed_at >= CURRENT_DATE - INTERVAL '30 days'
  AND t.actual_hours IS NOT NULL
  AND t.estimated_hours IS NOT NULL
GROUP BY assignee_id, e.name
ORDER BY completed_tasks DESC;
```

## ✅ Валидация

- `title` - обязательно, максимум 500 символов
- `project_id` - обязательно, должен существовать в projects
- `status` - обязательно, из списка: todo, in_progress, blocked, review, done
- `priority` - обязательно, 1, 2 или 3
- `progress_percent` - от 0 до 100
- `due_date` >= start_date (если оба указаны)
- `estimated_hours` >= 0
- `actual_hours` >= 0
