const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: не найдены переменные окружения SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupProjectsTables() {
  console.log('🔧 Настройка таблиц для проектов и задач...\n');

  try {
    // Проверяем существование таблицы projects
    console.log('1. Проверка таблицы projects...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (projectsError) {
      console.log('⚠️  Таблица projects не найдена или недоступна');
      console.log('   Необходимо выполнить SQL скрипт setup-projects-tables.sql в Supabase SQL Editor');
      console.log('   Или скопировать таблицы из backup/cloud-schema-complete.sql\n');
    } else {
      console.log('✅ Таблица projects существует\n');
    }

    // Проверяем существование таблицы tasks
    console.log('2. Проверка таблицы tasks...');
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);

    if (tasksError) {
      console.log('⚠️  Таблица tasks не найдена или недоступна');
      console.log('   Необходимо выполнить SQL скрипт setup-projects-tables.sql в Supabase SQL Editor\n');
    } else {
      console.log('✅ Таблица tasks существует\n');
    }

    // Проверяем наличие project_id в таблице invoices
    console.log('3. Проверка связи invoices -> projects...');
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, project_id')
      .limit(1);

    if (invoicesError) {
      console.log('⚠️  Ошибка при проверке invoices:', invoicesError.message);
    } else {
      console.log('✅ Связь invoices -> projects работает\n');
    }

    // Создаем тестовый проект для демонстрации
    console.log('4. Создание тестового проекта...');
    const { data: existingProjects } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (!existingProjects || existingProjects.length === 0) {
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert([{
          title: 'ЖК Солнечный',
          client: 'ООО "СтройКомплекс"',
          address: 'г. Москва, ул. Примерная, д. 1',
          status: 'active',
          description: 'Остекление 5-этажного дома\nКонтакт: Иванов И.И.\nТел: +7 (999) 123-45-67',
          budget: 5000000,
          due_date: '2025-12-31'
        }])
        .select();

      if (createError) {
        console.log('⚠️  Не удалось создать тестовый проект:', createError.message);
      } else {
        console.log('✅ Тестовый проект создан:', newProject[0].id);
        
        // Создаем несколько тестовых задач
        const { error: tasksCreateError } = await supabase
          .from('tasks')
          .insert([
            {
              title: 'Замеры объекта',
              description: 'Провести замеры всех окон',
              status: 'done',
              priority: 1,
              project_id: newProject[0].id,
              due_date: '2025-11-15'
            },
            {
              title: 'Согласование договора',
              description: 'Подписать договор с заказчиком',
              status: 'in_progress',
              priority: 1,
              project_id: newProject[0].id,
              due_date: '2025-11-20'
            },
            {
              title: 'Закупка профилей',
              description: 'Заказать профили у поставщика',
              status: 'todo',
              priority: 2,
              project_id: newProject[0].id,
              due_date: '2025-11-25'
            },
            {
              title: 'Изготовление конструкций',
              description: 'Производство оконных конструкций',
              status: 'todo',
              priority: 2,
              project_id: newProject[0].id,
              due_date: '2025-12-10'
            },
            {
              title: 'Монтаж',
              description: 'Установка окон на объекте',
              status: 'todo',
              priority: 1,
              project_id: newProject[0].id,
              due_date: '2025-12-20'
            }
          ]);

        if (tasksCreateError) {
          console.log('⚠️  Не удалось создать тестовые задачи:', tasksCreateError.message);
        } else {
          console.log('✅ Создано 5 тестовых задач\n');
        }
      }
    } else {
      console.log('ℹ️  Проекты уже существуют, тестовый проект не создан\n');
    }

    console.log('✅ Настройка завершена!');
    console.log('\n📋 Следующие шаги:');
    console.log('   1. Откройте http://localhost:3000/projects');
    console.log('   2. Создайте новый проект или используйте тестовый');
    console.log('   3. Добавьте задачи к проекту');
    console.log('   4. Привяжите счета к проекту для отслеживания бюджета\n');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

setupProjectsTables();
