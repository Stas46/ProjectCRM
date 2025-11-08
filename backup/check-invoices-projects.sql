-- Проверка счетов и их привязки к проектам

-- 1. Показать все проекты
SELECT id, name, status FROM public.projects ORDER BY created_at DESC LIMIT 10;

-- 2. Показать все счета
SELECT id, invoice_number, project_id, supplier, total_amount, status 
FROM public.invoices 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Показать счета без проекта
SELECT id, invoice_number, supplier, total_amount, status 
FROM public.invoices 
WHERE project_id IS NULL;

-- 4. Показать проекты со счетами
SELECT 
  p.id as project_id,
  p.name as project_name,
  COUNT(i.id) as invoices_count
FROM public.projects p
LEFT JOIN public.invoices i ON i.project_id = p.id
GROUP BY p.id, p.name
ORDER BY p.created_at DESC;
