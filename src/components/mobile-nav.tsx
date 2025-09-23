'use client';

import { Home, CalendarDays, FileText, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MobileNav = () => {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Проекты', href: '/' },
    { icon: FileText, label: 'Задачи', href: '/tasks' },
    { icon: CalendarDays, label: 'Календарь', href: '/calendar' },
    { icon: MessageSquare, label: 'Чаты', href: '/chats' },
    { icon: User, label: 'Профиль', href: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 py-2 sm:py-0 sm:hidden">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-3 py-2 text-xs ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon size={24} className={isActive ? 'fill-blue-100' : ''} />
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;