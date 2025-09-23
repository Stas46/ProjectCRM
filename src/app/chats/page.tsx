'use client';

import AppLayout from '@/components/app-layout';
import { 
  Search, 
  MoreVertical, 
  Send, 
  Paperclip, 
  Image, 
  File, 
  Plus,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { useState } from 'react';

// Типы для чатов и сообщений
interface ChatMessage {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  timestamp: Date;
  attachments?: {
    id: string;
    type: 'image' | 'document';
    name: string;
    url: string;
    size?: string;
  }[];
}

interface Chat {
  id: string;
  type: 'project' | 'task';
  name: string;
  projectId?: string;
  projectTitle?: string;
  taskId?: string;
  lastMessage?: {
    text: string;
    timestamp: Date;
    senderId: string;
    senderName: string;
  };
  unreadCount: number;
}

// Временные данные
const mockChats: Chat[] = [
  {
    id: '1',
    type: 'project',
    name: 'ЖК "Морской бриз"',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    lastMessage: {
      text: 'Завтра будем на объекте в 9:00',
      timestamp: new Date(2025, 8, 21, 17, 45), // 21 сентября 2025, 17:45
      senderId: '1',
      senderName: 'Иванов И.И.'
    },
    unreadCount: 2,
  },
  {
    id: '2',
    type: 'task',
    name: 'Замер окон',
    projectId: '1',
    projectTitle: 'ЖК "Морской бриз"',
    taskId: '1',
    lastMessage: {
      text: 'Отправил чертежи и спецификацию',
      timestamp: new Date(2025, 8, 20, 14, 12), // 20 сентября 2025, 14:12
      senderId: '3',
      senderName: 'Сидоров С.С.'
    },
    unreadCount: 0,
  },
  {
    id: '3',
    type: 'project',
    name: 'Коттедж Иванова',
    projectId: '2',
    projectTitle: 'Коттедж Иванова',
    lastMessage: {
      text: 'Клиент просит перенести встречу на пятницу',
      timestamp: new Date(2025, 8, 19, 9, 30), // 19 сентября 2025, 9:30
      senderId: '2',
      senderName: 'Петров П.П.'
    },
    unreadCount: 0,
  },
  {
    id: '4',
    type: 'project',
    name: 'Офисный центр "Горизонт"',
    projectId: '3',
    projectTitle: 'Офисный центр "Горизонт"',
    lastMessage: {
      text: 'Приложил акт приема-передачи',
      timestamp: new Date(2025, 8, 18, 16, 20), // 18 сентября 2025, 16:20
      senderId: '4',
      senderName: 'Козлов К.К.'
    },
    unreadCount: 0,
  },
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    chatId: '1',
    text: 'Добрый день, коллеги! Завтра выезжаем на объект для проведения замеров. Прошу всех быть готовыми к 8:30',
    senderId: '1',
    senderName: 'Иванов И.И.',
    senderInitials: 'ИИ',
    timestamp: new Date(2025, 8, 21, 10, 15), // 21 сентября 2025, 10:15
  },
  {
    id: '2',
    chatId: '1',
    text: 'Понял, буду готов. Нужно взять лазерный дальномер?',
    senderId: '2',
    senderName: 'Петров П.П.',
    senderInitials: 'ПП',
    timestamp: new Date(2025, 8, 21, 10, 30), // 21 сентября 2025, 10:30
  },
  {
    id: '3',
    chatId: '1',
    text: 'Да, и не забудьте планшет для составления чертежей. У заказчика будут вопросы по типам стеклопакетов',
    senderId: '1',
    senderName: 'Иванов И.И.',
    senderInitials: 'ИИ',
    timestamp: new Date(2025, 8, 21, 11, 5), // 21 сентября 2025, 11:05
  },
  {
    id: '4',
    chatId: '1',
    text: 'Привожу схему проезда и контакты представителя на объекте:',
    senderId: '3',
    senderName: 'Сидоров С.С.',
    senderInitials: 'СС',
    timestamp: new Date(2025, 8, 21, 14, 20), // 21 сентября 2025, 14:20
    attachments: [
      {
        id: '1',
        type: 'image',
        name: 'схема_проезда.jpg',
        url: '/схема_проезда.jpg',
      },
      {
        id: '2',
        type: 'document',
        name: 'контакты_объекта.pdf',
        url: '/контакты_объекта.pdf',
        size: '156 KB',
      },
    ],
  },
  {
    id: '5',
    chatId: '1',
    text: 'Спасибо за информацию! Завтра будем на объекте в 9:00',
    senderId: '1',
    senderName: 'Иванов И.И.',
    senderInitials: 'ИИ',
    timestamp: new Date(2025, 8, 21, 17, 45), // 21 сентября 2025, 17:45
  },
];

export default function ChatsPage() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(mockChats[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  
  const filteredChats = mockChats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const chatMessages = selectedChat 
    ? mockMessages.filter(msg => msg.chatId === selectedChat.id)
    : [];
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (date: Date) => {
    const today = new Date(2025, 8, 22); // Сегодня 22 сентября 2025 г.
    const yesterday = new Date(2025, 8, 21); // Вчера
    
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };
  
  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;
    
    // В реальном приложении здесь был бы API-запрос
    console.log(`Отправка сообщения в чат ${selectedChat.id}: ${messageText}`);
    
    // Очистка поля ввода
    setMessageText('');
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-180px)] rounded-lg overflow-hidden border border-gray-200 bg-white">
        {/* Список чатов */}
        <div className="w-full sm:w-1/3 md:w-1/4 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="search"
                className="w-full py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Поиск чатов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Чаты не найдены
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredChats.map(chat => (
                  <li 
                    key={chat.id}
                    className={`
                      cursor-pointer hover:bg-gray-50
                      ${selectedChat?.id === chat.id ? 'bg-blue-50' : ''}
                    `}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-1">{chat.name}</h3>
                          {chat.projectTitle && chat.type === 'task' && (
                            <p className="text-xs text-blue-600 mb-2">{chat.projectTitle}</p>
                          )}
                        </div>
                        
                        {chat.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatTime(chat.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      
                      {chat.lastMessage && (
                        <div className="flex items-start">
                          <p className="text-sm text-gray-500 line-clamp-1">
                            <span className="font-medium text-gray-700 mr-1">
                              {chat.lastMessage.senderName.split(' ')[0]}:
                            </span>
                            {chat.lastMessage.text}
                          </p>
                          
                          {chat.unreadCount > 0 && (
                            <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white text-xs">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            >
              <Plus size={18} className="mr-2" />
              Новый чат
            </button>
          </div>
        </div>
        
        {/* Чат */}
        {selectedChat ? (
          <div className="hidden sm:flex sm:w-2/3 md:w-3/4 flex-col">
            {/* Заголовок чата */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="font-medium text-gray-900">{selectedChat.name}</h2>
                {selectedChat.projectTitle && selectedChat.type === 'task' && (
                  <p className="text-sm text-blue-600">{selectedChat.projectTitle}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {selectedChat.type === 'project' && (
                  <button
                    type="button"
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    Перейти к проекту
                    <ChevronRight size={16} />
                  </button>
                )}
                
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
            
            {/* Сообщения */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-gray-500 mb-2">Нет сообщений</p>
                  <p className="text-sm text-gray-400">Начните общение прямо сейчас</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((message, index) => {
                    const prevMessage = index > 0 ? chatMessages[index - 1] : null;
                    const showDateDivider = !prevMessage || 
                      formatDate(prevMessage.timestamp) !== formatDate(message.timestamp);
                    
                    return (
                      <div key={message.id}>
                        {showDateDivider && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                              {formatDate(message.timestamp)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-start">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0 mr-3">
                            {message.senderInitials}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <span className="font-medium text-gray-900 mr-2">
                                {message.senderName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                            
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <p className="text-gray-800 whitespace-pre-wrap">{message.text}</p>
                              
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {message.attachments.map(attachment => (
                                    <div 
                                      key={attachment.id} 
                                      className="flex items-center p-2 border border-gray-200 rounded bg-gray-50"
                                    >
                                      {attachment.type === 'image' ? (
                                        <Image size={18} className="text-gray-500 mr-2" />
                                      ) : (
                                        <File size={18} className="text-gray-500 mr-2" />
                                      )}
                                      
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-700 truncate">
                                          {attachment.name}
                                        </div>
                                        {attachment.size && (
                                          <div className="text-xs text-gray-500">
                                            {attachment.size}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <button
                                        type="button"
                                        className="p-1 text-blue-600 hover:text-blue-800"
                                      >
                                        Скачать
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Форма отправки сообщения */}
            <div className="p-3 border-t border-gray-200">
              <div className="flex items-end">
                <div className="flex-1 bg-gray-100 rounded-lg p-2">
                  <textarea
                    className="w-full bg-transparent border-0 resize-none focus:ring-0 text-sm"
                    placeholder="Введите сообщение..."
                    rows={2}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  ></textarea>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
                        title="Прикрепить файл"
                      >
                        <Paperclip size={18} />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
                        title="Прикрепить изображение"
                      >
                        <Image size={18} />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
                        title="Указать местоположение"
                      >
                        <MapPin size={18} />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                      className={`
                        p-2 rounded-full
                        ${messageText.trim() 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                      `}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex sm:w-2/3 md:w-3/4 items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Выберите чат</h3>
              <p className="text-gray-500">
                Выберите существующий чат или создайте новый
              </p>
            </div>
          </div>
        )}
        
        {/* Мобильная версия - показывать только список чатов или только сообщения */}
        {selectedChat && (
          <div className="fixed inset-0 z-50 bg-white sm:hidden">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-200 flex items-center">
                <button
                  type="button"
                  className="p-2 mr-2 text-gray-500"
                  onClick={() => setSelectedChat(null)}
                >
                  <ChevronRight size={20} className="transform rotate-180" />
                </button>
                
                <div>
                  <h2 className="font-medium text-gray-900">{selectedChat.name}</h2>
                  {selectedChat.projectTitle && selectedChat.type === 'task' && (
                    <p className="text-sm text-blue-600">{selectedChat.projectTitle}</p>
                  )}
                </div>
                
                <button
                  type="button"
                  className="p-2 ml-auto text-gray-500"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {/* Мобильная версия сообщений - такая же разметка как выше */}
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500 mb-2">Нет сообщений</p>
                    <p className="text-sm text-gray-400">Начните общение прямо сейчас</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((message, index) => {
                      const prevMessage = index > 0 ? chatMessages[index - 1] : null;
                      const showDateDivider = !prevMessage || 
                        formatDate(prevMessage.timestamp) !== formatDate(message.timestamp);
                      
                      return (
                        <div key={message.id}>
                          {showDateDivider && (
                            <div className="flex justify-center my-4">
                              <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                                {formatDate(message.timestamp)}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-start">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0 mr-3">
                              {message.senderInitials}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center mb-1">
                                <span className="font-medium text-gray-900 mr-2">
                                  {message.senderName}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTime(message.timestamp)}
                                </span>
                              </div>
                              
                              <div className="bg-white rounded-lg p-3 shadow-sm">
                                <p className="text-gray-800 whitespace-pre-wrap">{message.text}</p>
                                
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    {message.attachments.map(attachment => (
                                      <div 
                                        key={attachment.id} 
                                        className="flex items-center p-2 border border-gray-200 rounded bg-gray-50"
                                      >
                                        {attachment.type === 'image' ? (
                                          <Image size={18} className="text-gray-500 mr-2" />
                                        ) : (
                                          <File size={18} className="text-gray-500 mr-2" />
                                        )}
                                        
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-700 truncate">
                                            {attachment.name}
                                          </div>
                                          {attachment.size && (
                                            <div className="text-xs text-gray-500">
                                              {attachment.size}
                                            </div>
                                          )}
                                        </div>
                                        
                                        <button
                                          type="button"
                                          className="p-1 text-blue-600 hover:text-blue-800"
                                        >
                                          Скачать
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-3 border-t border-gray-200">
                <div className="flex items-end">
                  <div className="flex-1 bg-gray-100 rounded-lg p-2">
                    <textarea
                      className="w-full bg-transparent border-0 resize-none focus:ring-0 text-sm"
                      placeholder="Введите сообщение..."
                      rows={2}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                    ></textarea>
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
                          title="Прикрепить файл"
                        >
                          <Paperclip size={18} />
                        </button>
                        <button
                          type="button"
                          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
                          title="Прикрепить изображение"
                        >
                          <Image size={18} />
                        </button>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={!messageText.trim()}
                        className={`
                          p-2 rounded-full
                          ${messageText.trim() 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                        `}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}