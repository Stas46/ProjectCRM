interface ProjectMessage {
  id: string;
  user: {
    id: string;
    name: string;
    initials: string;
    avatar?: string;
  };
  content: string;
  created_at: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: string;
    url: string;
  }[];
}

export const mockMessages: ProjectMessage[] = [
  {
    id: '1',
    user: {
      id: '1',
      name: 'Иванов И.И.',
      initials: 'ИИ'
    },
    content: 'Добрый день! По результатам встречи с заказчиком, необходимо уточнить размеры окон в корпусе Б. Петров, можете выехать на замеры в четверг?',
    created_at: '2025-09-10T10:32:00',
    attachments: []
  },
  {
    id: '2',
    user: {
      id: '2',
      name: 'Петров П.П.',
      initials: 'ПП'
    },
    content: 'Да, могу в четверг после обеда, примерно к 14:00.',
    created_at: '2025-09-10T11:15:00',
    attachments: []
  },
  {
    id: '3',
    user: {
      id: '1',
      name: 'Иванов И.И.',
      initials: 'ИИ'
    },
    content: 'Отлично. Прикрепляю предварительные чертежи. Обратите внимание на 3-й и 5-й этажи, там нестандартные размеры.',
    created_at: '2025-09-10T11:30:00',
    attachments: [
      {
        id: '1',
        name: 'Чертежи-корпус-Б.pdf',
        type: 'application/pdf',
        size: '2.4 MB',
        url: '/files/1'
      }
    ]
  },
  {
    id: '4',
    user: {
      id: '3',
      name: 'Сидоров С.С.',
      initials: 'СС'
    },
    content: 'Мы подготовили план-график монтажных работ. Планируем начать 1 октября с корпуса А.',
    created_at: '2025-09-12T09:45:00',
    attachments: [
      {
        id: '2',
        name: 'График-монтажа.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: '534 KB',
        url: '/files/2'
      }
    ]
  }
];