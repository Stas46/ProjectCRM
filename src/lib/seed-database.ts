import { supabase } from '@/lib/supabase';

// Функция для создания тестовых данных
export async function seedDatabase() {
  try {
    console.log('Начало заполнения базы данных тестовыми данными...');

    // 1. Создание проектов
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .insert([
        {
          name: 'Жилой комплекс "Морской бриз"',
          address: 'г. Москва, ул. Приморская, д. 15',
          status: 'in_progress',
          end_date: '2025-12-31',
          budget: 1250000,
          description: 'Остекление фасада жилого комплекса из 3 корпусов. Используются алюминиевые профили и энергосберегающие стеклопакеты.'
        },
        {
          name: 'Бизнес-центр "Горизонт"',
          address: 'г. Москва, пр. Ленинградский, д. 80',
          status: 'planning',
          end_date: '2026-04-30',
          budget: 3500000,
          description: 'Проект по остеклению фасада бизнес-центра класса А. Требуется установка современных стеклопакетов с повышенной шумоизоляцией.'
        },
        {
          name: 'Коттеджный поселок "Сосновый бор"',
          address: 'Московская обл., Одинцовский р-н',
          status: 'on_hold',
          end_date: '2025-09-15',
          budget: 980000,
          description: 'Остекление 12 коттеджей в поселке. Требуются деревянные окна премиум-класса с повышенной теплоизоляцией.'
        },
        {
          name: 'Торговый центр "Мегаполис"',
          address: 'г. Москва, ул. Торговая, д. 55',
          status: 'completed',
          end_date: '2025-06-30',
          budget: 2100000,
          description: 'Проект по замене витринных стекол в торговом центре. Установка закаленных стеклопакетов повышенной прочности.'
        }
      ])
      .select();

    if (projectsError) {
      throw new Error(`Ошибка при создании проектов: ${projectsError.message}`);
    }

    console.log(`Создано ${projects?.length || 0} проектов`);

    // Сохраняем ID проектов для создания связанных данных
    const projectIds = projects?.map(p => p.id) || [];
    
    if (projectIds.length === 0) {
      throw new Error('Не удалось создать проекты');
    }

    // 2. Создание сотрудников
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .insert([
        {
          name: 'Иванов Иван Иванович',
          position: 'Замерщик',
          email: 'ivanov@example.com',
          phone: '+7 (910) 123-45-67'
        },
        {
          name: 'Петров Петр Петрович',
          position: 'Монтажник',
          email: 'petrov@example.com',
          phone: '+7 (920) 234-56-78'
        },
        {
          name: 'Сидоров Сергей Сергеевич',
          position: 'Монтажник',
          email: 'sidorov@example.com',
          phone: '+7 (930) 345-67-89'
        },
        {
          name: 'Козлов Константин Константинович',
          position: 'Монтажник',
          email: 'kozlov@example.com',
          phone: '+7 (940) 456-78-90'
        },
        {
          name: 'Новиков Николай Николаевич',
          position: 'Водитель',
          email: 'novikov@example.com',
          phone: '+7 (950) 567-89-01'
        },
        {
          name: 'Соколов Станислав Станиславович',
          position: 'Логист',
          email: 'sokolov@example.com',
          phone: '+7 (960) 678-90-12'
        }
      ])
      .select();

    if (employeesError) {
      throw new Error(`Ошибка при создании сотрудников: ${employeesError.message}`);
    }

    console.log(`Создано ${employees?.length || 0} сотрудников`);

    // Сохраняем ID сотрудников
    const employeeIds = employees?.map(e => e.id) || [];
    
    if (employeeIds.length === 0) {
      throw new Error('Не удалось создать сотрудников');
    }

    // 3. Создание бригад
    const { data: crews, error: crewsError } = await supabase
      .from('crews')
      .insert([
        {
          name: 'Бригада №1',
          description: 'Бригада замерщиков'
        },
        {
          name: 'Бригада №2',
          description: 'Бригада монтажников'
        },
        {
          name: 'Бригада №3',
          description: 'Бригада логистов'
        }
      ])
      .select();

    if (crewsError) {
      throw new Error(`Ошибка при создании бригад: ${crewsError.message}`);
    }

    console.log(`Создано ${crews?.length || 0} бригад`);

    // Сохраняем ID бригад
    const crewIds = crews?.map(c => c.id) || [];
    
    if (crewIds.length === 0) {
      throw new Error('Не удалось создать бригады');
    }

    // 4. Создание связей между бригадами и сотрудниками
    const crewMembers = [
      { crew_id: crewIds[0], employee_id: employeeIds[0] }, // Иванов в Бригаде №1
      { crew_id: crewIds[0], employee_id: employeeIds[1] }, // Петров в Бригаде №1
      { crew_id: crewIds[1], employee_id: employeeIds[2] }, // Сидоров в Бригаде №2
      { crew_id: crewIds[1], employee_id: employeeIds[3] }, // Козлов в Бригаде №2
      { crew_id: crewIds[1], employee_id: employeeIds[4] }, // Новиков в Бригаде №2
      { crew_id: crewIds[2], employee_id: employeeIds[5] }  // Соколов в Бригаде №3
    ];

    const { data: crewMembersData, error: crewMembersError } = await supabase
      .from('crew_members')
      .insert(crewMembers);

    if (crewMembersError) {
      throw new Error(`Ошибка при создании связей бригад: ${crewMembersError.message}`);
    }

    console.log(`Создано ${crewMembers.length} связей между бригадами и сотрудниками`);

    // 5. Создание задач
    const tasks = [
      {
        title: 'Замер окон на объекте',
        description: 'Выполнить замер всех окон в корпусе А, подготовить чертежи и спецификацию',
        status: 'in_progress',
        priority: 2,
        project_id: projectIds[0], // "Морской бриз"
        assignee_id: employeeIds[0], // Иванов И.И.
        due_date: '2025-10-05'
      },
      {
        title: 'Заказ материалов',
        description: 'Сформировать заказ на профиль, стеклопакеты и фурнитуру',
        status: 'todo',
        priority: 1,
        project_id: projectIds[1], // "Горизонт"
        assignee_id: employeeIds[1], // Петров П.П.
        due_date: '2025-09-30'
      },
      {
        title: 'Согласование проекта',
        description: 'Согласовать проект остекления с архитектором и заказчиком',
        status: 'blocked',
        priority: 1,
        project_id: projectIds[2], // "Сосновый бор"
        assignee_id: employeeIds[2], // Сидоров С.С.
        due_date: '2025-09-25'
      },
      {
        title: 'Подготовка монтажной бригады',
        description: 'Сформировать бригаду, подготовить инструменты и материалы',
        status: 'todo',
        priority: 2,
        project_id: projectIds[0], // "Морской бриз"
        due_date: '2025-10-10'
      },
      {
        title: 'Финальная проверка монтажа',
        description: 'Проверить качество установки, оформить акт приема-передачи',
        status: 'done',
        priority: 2,
        project_id: projectIds[3], // "Мегаполис"
        assignee_id: employeeIds[0], // Иванов И.И.
        due_date: '2025-09-20'
      }
    ];

    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .insert(tasks)
      .select();

    if (tasksError) {
      throw new Error(`Ошибка при создании задач: ${tasksError.message}`);
    }

    console.log(`Создано ${tasksData?.length || 0} задач`);

    // 6. Создание смен в календаре
    const shifts = [
      {
        title: 'Замер окон',
        project_id: projectIds[0], // "Морской бриз"
        crew_id: crewIds[0], // Бригада №1
        start_time: new Date(2025, 8, 25, 9, 0).toISOString(), // 25 сентября 2025, 9:00
        end_time: new Date(2025, 8, 25, 12, 0).toISOString(), // 25 сентября 2025, 12:00
        location: 'г. Москва, ул. Приморская, д. 15',
        description: 'Провести полный замер оконных проемов на первом этаже здания A'
      },
      {
        title: 'Монтаж окон (этаж 1)',
        project_id: projectIds[0], // "Морской бриз"
        crew_id: crewIds[1], // Бригада №2
        start_time: new Date(2025, 8, 26, 8, 0).toISOString(), // 26 сентября 2025, 8:00
        end_time: new Date(2025, 8, 26, 17, 0).toISOString(), // 26 сентября 2025, 17:00
        location: 'г. Москва, ул. Приморская, д. 15',
        description: 'Монтаж пластиковых окон согласно проекту на первом этаже здания A'
      },
      {
        title: 'Замер окон',
        project_id: projectIds[2], // "Сосновый бор"
        crew_id: crewIds[0], // Бригада №1
        start_time: new Date(2025, 8, 27, 14, 0).toISOString(), // 27 сентября 2025, 14:00
        end_time: new Date(2025, 8, 27, 16, 0).toISOString(), // 27 сентября 2025, 16:00
        location: 'Московская обл., Одинцовский р-н',
        description: 'Провести замер оконных проемов для частного коттеджа'
      },
      {
        title: 'Доставка материалов',
        project_id: projectIds[3], // "Мегаполис"
        start_time: new Date(2025, 8, 24, 10, 0).toISOString(), // 24 сентября 2025, 10:00
        end_time: new Date(2025, 8, 24, 12, 0).toISOString(), // 24 сентября 2025, 12:00
        location: 'г. Москва, ул. Торговая, д. 55',
        description: 'Доставка материалов для монтажа'
      }
    ];

    const { data: shiftsData, error: shiftsError } = await supabase
      .from('shifts')
      .insert(shifts)
      .select();

    if (shiftsError) {
      throw new Error(`Ошибка при создании смен: ${shiftsError.message}`);
    }

    console.log(`Создано ${shiftsData?.length || 0} смен`);

    // 7. Создание связей между сменами и сотрудниками
    if (shiftsData && shiftsData.length > 0) {
      const shiftAssignees = [
        { shift_id: shiftsData[0].id, employee_id: employeeIds[0] }, // Иванов на замер
        { shift_id: shiftsData[0].id, employee_id: employeeIds[1] }, // Петров на замер
        { shift_id: shiftsData[1].id, employee_id: employeeIds[2] }, // Сидоров на монтаж
        { shift_id: shiftsData[1].id, employee_id: employeeIds[3] }, // Козлов на монтаж
        { shift_id: shiftsData[1].id, employee_id: employeeIds[4] }, // Новиков на монтаж
        { shift_id: shiftsData[2].id, employee_id: employeeIds[0] }, // Иванов на замер
        { shift_id: shiftsData[3].id, employee_id: employeeIds[5] }  // Соколов на доставку
      ];

      const { data: shiftAssigneesData, error: shiftAssigneesError } = await supabase
        .from('shift_assignees')
        .insert(shiftAssignees);

      if (shiftAssigneesError) {
        throw new Error(`Ошибка при создании назначений смен: ${shiftAssigneesError.message}`);
      }

      console.log(`Создано ${shiftAssignees.length} назначений сотрудников на смены`);
    }

    // 8. Создание счетов
    const invoices = [
      {
        project_id: projectIds[0], // "Морской бриз"
        vendor: 'ООО "СтеклоПром"',
        number: '2025-0356',
        issue_date: '2025-09-15',
        amount: 450000,
        status: 'paid',
        category: 'Материалы',
        file_url: '/files/invoice-1.pdf'
      },
      {
        project_id: projectIds[0], // "Морской бриз"
        vendor: 'ИП Соколов А.В.',
        number: '78-2025',
        issue_date: '2025-09-18',
        amount: 125000,
        status: 'to_pay',
        category: 'Монтаж',
        file_url: '/files/invoice-2.pdf'
      },
      {
        project_id: projectIds[1], // "Горизонт"
        vendor: 'ООО "ФурнитураПлюс"',
        number: '2025/09-42',
        issue_date: '2025-09-10',
        amount: 85000,
        status: 'paid',
        category: 'Фурнитура',
        file_url: '/files/invoice-3.pdf'
      },
      {
        project_id: projectIds[2], // "Сосновый бор"
        vendor: 'ООО "АлюмСистемс"',
        number: 'ТН-2025-1204',
        issue_date: '2025-09-05',
        amount: 780000,
        status: 'paid',
        category: 'ПВХ/Алюминий'
      },
      {
        project_id: projectIds[2], // "Сосновый бор"
        vendor: 'ООО "ТрансЛогистик"',
        number: '456-Т',
        issue_date: '2025-09-12',
        amount: 45000,
        status: 'to_pay',
        category: 'Логистика',
        file_url: '/files/invoice-5.pdf'
      },
      {
        project_id: projectIds[3], // "Мегаполис"
        vendor: 'ИП Николаев С.С.',
        number: '2025/09-17',
        issue_date: '2025-09-17',
        amount: 35000,
        status: 'draft',
        category: 'Прочее'
      }
    ];

    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .insert(invoices)
      .select();

    if (invoicesError) {
      throw new Error(`Ошибка при создании счетов: ${invoicesError.message}`);
    }

    console.log(`Создано ${invoicesData?.length || 0} счетов`);

    console.log('База данных успешно заполнена тестовыми данными!');
    return { success: true };
  } catch (error) {
    console.error('Ошибка при заполнении базы данных:', error);
    return { success: false, error };
  }
}