'use client';

import { Home, CalendarDays, FileText, MessageSquare, User, Menu, X, FileSearch, Building } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const SideNav = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { icon: Home, label: 'Проекты', href: '/' },
    { icon: FileText, label: 'Задачи', href: '/tasks' },
    { icon: CalendarDays, label: 'Календарь', href: '/calendar' },
    { icon: MessageSquare, label: 'Чаты', href: '/chats' },
    { icon: FileSearch, label: 'Все счета', href: '/invoices' },
    { icon: Building, label: 'Поставщики', href: '/suppliers' },
    { icon: User, label: 'Профиль', href: '/profile' },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="fixed top-4 left-4 z-50 sm:hidden bg-white rounded-full p-2 shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full z-40 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out
          w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          sm:translate-x-0 sm:relative sm:shrink-0
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold">Glazing CRM</h1>
          </div>
          
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center px-4 py-3 text-sm transition-colors rounded-md
                        ${isActive 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon size={20} className="mr-3" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                У
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Пользователь</p>
                <p className="text-xs text-gray-500">user@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideNav;