-- ========================================
-- ТЕСТОВЫЕ ДАННЫЕ ДЛЯ ПРОВЕРКИ СХЕМЫ
-- ========================================

-- ========================================
-- 1. КЛИЕНТЫ
-- ========================================

-- Физическое лицо
INSERT INTO public.clients (
  type, first_name, last_name, middle_name,
  phone, email, source, rating
) VALUES (
  'individual', 'Иван', 'Петров', 'Сергеевич',
  '+79161234567', 'ivanov@example.com', 'website', 5
);

-- Компания
INSERT INTO public.clients (
  type, company_name, inn, kpp, ogrn,
  phone, email, legal_address, actual_address,
  contact_person, contact_person_position,
  source, rating
) VALUES (
  'company', 'ООО "СтройТех"', '7701234567', '770101001', '1027700000001',
  '+74951234567', 'info@stroytech.ru', 
  'г. Москва, ул. Ленина, д. 1',
  'г. Москва, ул. Ленина, д. 1',
  'Сидоров Петр Иванович', 'Генеральный директор',
  'recommendation', 5
);

-- ========================================
-- 2. СОТРУДНИКИ
-- ========================================

-- Менеджер
INSERT INTO public.employees (
  first_name, last_name, middle_name,
  position, phone, email,
  hire_date, employment_status,
  salary, salary_type
) VALUES (
  'Мария', 'Смирнова', 'Петровна',
  'Менеджер проектов', '+79261234567', 'maria@example.com',
  '2023-01-15', 'active',
  80000, 'fixed'
);

-- Монтажник
INSERT INTO public.employees (
  first_name, last_name, middle_name,
  position, phone, email,
  hire_date, employment_status,
  salary, salary_type
) VALUES (
  'Алексей', 'Кузнецов', 'Иванович',
  'Монтажник', '+79271234567', 'alexey@example.com',
  '2023-03-20', 'active',
  60000, 'fixed'
);

-- ========================================
-- 3. ПРОЕКТЫ
-- ========================================

INSERT INTO public.projects (
  name, 
  client_id, 
  manager_id,
  status,
  start_date,
  end_date,
  budget,
  contract_number,
  contract_date,
  description,
  address,
  area_sqm,
  window_count
) VALUES (
  'Остекление квартиры на Ленина 10',
  (SELECT id FROM public.clients WHERE first_name = 'Иван' LIMIT 1),
  (SELECT id FROM public.employees WHERE first_name = 'Мария' LIMIT 1),
  'in_progress',
  '2024-02-01',
  '2024-03-01',
  250000,
  'ДОГ-2024-001',
  '2024-01-25',
  'Установка пластиковых окон в 3-комнатной квартире',
  'г. Москва, ул. Ленина, д. 10, кв. 25',
  75.5,
  5
);

-- ========================================
-- 4. ПОСТАВЩИКИ
-- ========================================

INSERT INTO public.suppliers (
  name, inn, kpp, category,
  phone, email, address,
  contact_person, contact_person_position,
  contact_person_phone, contact_person_email,
  bank_name, bank_bik, bank_account,
  payment_terms, delivery_terms,
  is_active
) VALUES (
  'ООО "Профиль+"',
  '7702123456', '770201001',
  'profile',
  '+74952345678', 'sales@profil-plus.ru',
  'г. Москва, Варшавское шоссе, д. 42',
  'Николаев Сергей Петрович', 'Менеджер по продажам',
  '+79031234567', 'nikolaev@profil-plus.ru',
  'ПАО Сбербанк', '044525225', '40702810400000012345',
  'Предоплата 50%, остаток по факту поставки',
  'Доставка по Москве - бесплатно при заказе от 50000 руб',
  true
);

-- ========================================
-- 5. СЧЕТА
-- ========================================

INSERT INTO public.invoices (
  invoice_number,
  project_id,
  supplier_id,
  supplier_name,
  supplier_inn,
  issue_date,
  due_date,
  total_amount,
  category,
  payment_status,
  items,
  description
) VALUES (
  'СЧ-2024-001',
  (SELECT id FROM public.projects LIMIT 1),
  (SELECT id FROM public.suppliers LIMIT 1),
  'ООО "Профиль+"',
  '7702123456',
  '2024-02-05',
  '2024-02-20',
  125000,
  'profile',
  'pending',
  '[
    {"name": "Профиль ПВХ 70мм", "quantity": 50, "unit": "м.п.", "price": 1500, "amount": 75000},
    {"name": "Фурнитура для окон", "quantity": 5, "unit": "компл.", "price": 10000, "amount": 50000}
  ]'::jsonb,
  'Материалы для остекления квартиры на Ленина 10'
);

-- ========================================
-- 6. ЗАДАЧИ
-- ========================================

-- Основная задача
INSERT INTO public.tasks (
  title,
  project_id,
  assigned_to_id,
  status,
  priority,
  due_date,
  description,
  checklist,
  estimated_hours
) VALUES (
  'Замер помещения',
  (SELECT id FROM public.projects LIMIT 1),
  (SELECT id FROM public.employees WHERE position = 'Монтажник' LIMIT 1),
  'in_progress',
  'high',
  '2024-02-03',
  'Выполнить точный замер всех оконных проемов',
  '[
    {"id": 1, "text": "Измерить ширину проемов", "completed": true},
    {"id": 2, "text": "Измерить высоту проемов", "completed": true},
    {"id": 3, "text": "Проверить геометрию", "completed": false},
    {"id": 4, "text": "Сфотографировать проемы", "completed": false}
  ]'::jsonb,
  4
);

-- Подзадача
INSERT INTO public.tasks (
  title,
  project_id,
  parent_task_id,
  assigned_to_id,
  status,
  priority,
  due_date,
  description
) VALUES (
  'Подготовить чертежи',
  (SELECT id FROM public.projects LIMIT 1),
  (SELECT id FROM public.tasks WHERE title = 'Замер помещения' LIMIT 1),
  (SELECT id FROM public.employees WHERE first_name = 'Мария' LIMIT 1),
  'pending',
  'medium',
  '2024-02-05',
  'На основе замеров подготовить чертежи для производства'
);

-- ========================================
-- 7. КОММЕНТАРИИ К ЗАДАЧАМ
-- ========================================

INSERT INTO public.task_comments (
  task_id,
  author_id,
  text
) VALUES (
  (SELECT id FROM public.tasks WHERE title = 'Замер помещения' LIMIT 1),
  (SELECT id FROM public.employees WHERE first_name = 'Мария' LIMIT 1),
  'Проверьте, пожалуйста, особенности подоконников в спальне'
);

-- ========================================
-- 8. БРИГАДЫ
-- ========================================

INSERT INTO public.crews (
  name,
  description,
  is_active
) VALUES (
  'Бригада №1 (Монтаж)',
  'Основная монтажная бригада',
  true
);

-- ========================================
-- 9. ЧЛЕНЫ БРИГАДЫ
-- ========================================

INSERT INTO public.crew_members (
  crew_id,
  employee_id,
  role,
  is_active
) VALUES (
  (SELECT id FROM public.crews LIMIT 1),
  (SELECT id FROM public.employees WHERE first_name = 'Алексей' LIMIT 1),
  'Старший монтажник',
  true
);

-- ========================================
-- 10. СМЕНЫ
-- ========================================

INSERT INTO public.shifts (
  title,
  project_id,
  crew_id,
  start_time,
  end_time,
  location,
  description,
  status
) VALUES (
  'Монтаж окон - Ленина 10',
  (SELECT id FROM public.projects LIMIT 1),
  (SELECT id FROM public.crews LIMIT 1),
  '2024-02-10 09:00:00+03',
  '2024-02-10 18:00:00+03',
  'г. Москва, ул. Ленина, д. 10, кв. 25',
  'Установка окон в жилых комнатах',
  'scheduled'
);

-- ========================================
-- 11. НАЗНАЧЕНИЯ НА СМЕНЫ
-- ========================================

INSERT INTO public.shift_assignees (
  shift_id,
  employee_id,
  status
) VALUES (
  (SELECT id FROM public.shifts LIMIT 1),
  (SELECT id FROM public.employees WHERE first_name = 'Алексей' LIMIT 1),
  'confirmed'
);

-- ========================================
-- 12. СООБЩЕНИЯ В ПРОЕКТАХ
-- ========================================

INSERT INTO public.project_messages (
  project_id,
  user_id,
  content,
  message_type
) VALUES (
  (SELECT id FROM public.projects LIMIT 1),
  (SELECT id FROM public.employees WHERE first_name = 'Мария' LIMIT 1)::text::uuid,
  'Проект запущен. Начинаем работу по графику.',
  'text'
);

-- ========================================
-- 13. ПОЛЬЗОВАТЕЛЬСКИЕ КАТЕГОРИИ
-- ========================================

INSERT INTO public.custom_expense_categories (
  name,
  project_id,
  description,
  color
) VALUES (
  'Доп. работы',
  (SELECT id FROM public.projects LIMIT 1),
  'Дополнительные работы по просьбе клиента',
  '#FF6B6B'
);

-- ========================================
-- ПРОВЕРКА
-- ========================================

-- Выводим статистику
SELECT 
  'clients' as table_name, COUNT(*) as count FROM public.clients
UNION ALL
SELECT 'employees', COUNT(*) FROM public.employees
UNION ALL
SELECT 'projects', COUNT(*) FROM public.projects
UNION ALL
SELECT 'suppliers', COUNT(*) FROM public.suppliers
UNION ALL
SELECT 'invoices', COUNT(*) FROM public.invoices
UNION ALL
SELECT 'tasks', COUNT(*) FROM public.tasks
UNION ALL
SELECT 'task_comments', COUNT(*) FROM public.task_comments
UNION ALL
SELECT 'crews', COUNT(*) FROM public.crews
UNION ALL
SELECT 'crew_members', COUNT(*) FROM public.crew_members
UNION ALL
SELECT 'shifts', COUNT(*) FROM public.shifts
UNION ALL
SELECT 'shift_assignees', COUNT(*) FROM public.shift_assignees
UNION ALL
SELECT 'project_messages', COUNT(*) FROM public.project_messages
UNION ALL
SELECT 'custom_expense_categories', COUNT(*) FROM public.custom_expense_categories;

-- Проверяем, что триггеры сработали
SELECT 
  p.name as project_name,
  p.actual_cost,
  (SELECT SUM(total_amount) FROM public.invoices WHERE project_id = p.id) as invoices_total,
  s.total_orders,
  s.total_amount as supplier_total
FROM public.projects p
LEFT JOIN public.suppliers s ON s.name = 'ООО "Профиль+"';

-- Проверяем подзадачи
SELECT 
  parent.title as parent_task,
  parent.subtasks_count,
  parent.subtasks_completed_count,
  COUNT(child.id) as actual_subtasks_count
FROM public.tasks parent
LEFT JOIN public.tasks child ON child.parent_task_id = parent.id
WHERE parent.parent_task_id IS NULL
GROUP BY parent.id, parent.title, parent.subtasks_count, parent.subtasks_completed_count;
