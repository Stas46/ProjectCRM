import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/projects/[id]/page.tsx';
let content = readFileSync(filePath, 'utf-8');

// 1. Обновить интерфейс Task
content = content.replace(
  `interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'done';
  priority: number; // 1 = high, 2 = medium, 3 = low
  due_date: string | null;
  created_at: string;
}`,
  `interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: number; // 1 = high, 2 = medium, 3 = low
  due_date: string | null;
  created_at: string;
}`
);

// 2. Обновить taskData с добавлением status
content = content.replace(
  `const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 2, // medium по умолчанию
    due_date: '',
  });`,
  `const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 2 as 1 | 2 | 3,
    status: 'todo' as 'todo' | 'in_progress',
    due_date: '',
  });`
);

// 3. Обновить toggleTaskStatus для циклического переключения
content = content.replace(
  `const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };`,
  `const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      // Циклическое переключение: todo → in_progress → done → todo
      const statusCycle: Record<string, 'todo' | 'in_progress' | 'done'> = {
        'todo': 'in_progress',
        'in_progress': 'done',
        'done': 'todo'
      };
      const newStatus = statusCycle[currentStatus] || 'todo';

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };`
);

// 4. Обновить createTask для использования status
content = content.replace(
  `const newTask = {
        project_id: projectId,
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority,
        due_date: taskData.due_date || null,
        status: 'todo' as const,
      };`,
  `const newTask = {
        project_id: projectId,
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority,
        status: taskData.status,
        due_date: taskData.due_date || null,
      };`
);

content = content.replace(
  `setTaskData({
        title: '',
        description: '',
        priority: 2,
        due_date: '',`,
  `setTaskData({
        title: '',
        description: '',
        priority: 2,
        status: 'todo',
        due_date: '',`
);

// 5. Обновить отображение задачи с новыми badge
content = content.replace(
  `<div className="flex items-center gap-2 mt-1">
                        <span className={` + '`text-xs ${priorityLabels[task.priority as keyof typeof priorityLabels]?.color || \'text-gray-600\'}' + `}>
                          {task.priority === 1 ? '🔴' : task.priority === 2 ? '🟡' : '🟢'}
                          {' '}{priorityLabels[task.priority as keyof typeof priorityLabels]?.label || 'Неизвестно'}
                        </span>
                        {task.due_date && <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString('ru-RU')}</span>}
                      </div>`,
  `<div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {task.priority === 1 && (
                          <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-semibold">⭐ Важно</span>
                        )}
                        {task.status === 'in_progress' && (
                          <span className="text-xs bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-semibold">⚡ Срочно</span>
                        )}
                        {task.due_date && (
                          <span className="text-xs bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full font-semibold">
                            📅 {new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>`
);

// 6. Добавить сортировку по приоритету
content = content.replace(
  `// Сортировка: невыполненные (новые сверху) -> выполненные (старые снизу)
                  const sortedTasks = [...tasks].sort((a, b) => {
                    // Сначала группируем по статусу
                    if (a.status !== b.status) {
                      return a.status === 'todo' ? -1 : 1;
                    }
                    // Внутри группы: невыполненные - от новых к старым, выполненные - от старых к новым
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    return a.status === 'todo' ? dateB - dateA : dateA - dateB;
                  });`,
  `// Сортировка: сначала активные, потом выполненные
                  // Внутри активных: важные+срочные, важные, срочные, обычные
                  const sortedTasks = [...tasks].sort((a, b) => {
                    // Выполненные в конец
                    if (a.status === 'done' && b.status !== 'done') return 1;
                    if (a.status !== 'done' && b.status === 'done') return -1;
                    
                    // Если оба выполнены или оба активны - сортируем по приоритету и статусу
                    const scoreA = (a.priority === 1 ? 10 : 0) + (a.status === 'in_progress' ? 5 : 0);
                    const scoreB = (b.priority === 1 ? 10 : 0) + (b.status === 'in_progress' ? 5 : 0);
                    
                    if (scoreA !== scoreB) return scoreB - scoreA; // Больший score выше
                    
                    // Если score одинаковый - новые сверху
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    return dateB - dateA;
                  });`
);

// 7. Заменить форму создания задачи
content = content.replace(
  `<div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Приоритет</label>
                      <select
                        value={taskData.priority}
                        onChange={e => setTaskData({ ...taskData, priority: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                      >
                        <option value="3">Низкий</option>
                        <option value="2">Средний</option>
                        <option value="1">Высокий</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Срок</label>
                      <input
                        type="date"
                        value={taskData.due_date}
                        onChange={e => setTaskData({ ...taskData, due_date: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                      />
                    </div>
                  </div>`,
  `<div>
                    <label className="block text-xs text-gray-600 mb-1">Тип задачи</label>
                    <select
                      value={\`\${taskData.priority}-\${taskData.status}\`}
                      onChange={e => {
                        const [priority, status] = e.target.value.split('-');
                        setTaskData({ 
                          ...taskData, 
                          priority: parseInt(priority) as 1 | 2 | 3,
                          status: status as 'todo' | 'in_progress'
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                    >
                      <option value="1-in_progress">Важная и Срочная</option>
                      <option value="1-todo">Важная</option>
                      <option value="2-in_progress">Срочная</option>
                      <option value="2-todo">Обычная</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Срок</label>
                    <input
                      type="date"
                      value={taskData.due_date}
                      onChange={e => setTaskData({ ...taskData, due_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
                    />
                  </div>`
);

writeFileSync(filePath, content, 'utf-8');
console.log('✅ Файл успешно обновлен!');
