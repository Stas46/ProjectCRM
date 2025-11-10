'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('👤 Текущий пользователь:', user);
      
      if (user) {
        setCurrentUser(user);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        console.log('📋 Профиль:', profile, 'Ошибка:', profileError);
        
        if (profile?.role === 'admin') {
          setIsAdmin(true);
          console.log('✅ Пользователь является админом');
        } else {
          console.log('❌ Пользователь НЕ админ, роль:', profile?.role);
        }
      } else {
        console.log('❌ Пользователь не авторизован - редирект на /login');
        router.push('/login');
      }
    } catch (err) {
      console.error('❌ Load user error:', err);
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Выход из системы...');
      const { supabase } = await import('@/lib/supabase');
      await supabase.auth.signOut();
      console.log('✅ Выход выполнен');
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('❌ Logout error:', err);
    }
  };

  console.log('🎨 Рендер главной страницы. currentUser:', currentUser?.email, 'isAdmin:', isAdmin);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">CRM Система</h1>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <span className="text-sm text-gray-600">{currentUser.email}</span>
            ) : (
              <span className="text-sm text-gray-400">Загрузка...</span>
            )}
            {isAdmin && (
              <button
                onClick={() => {
                  console.log('🔧 Переход в админ-панель');
                  router.push('/admin/users');
                }}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Админ-панель"
              >
                <Settings className="w-4 h-4" />
                Админ
              </button>
            )}
            {currentUser && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Выход"
              >
                <LogOut className="w-4 h-4" />
                Выход
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Главное меню */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/projects"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏗️</span>
              <h2 className="text-lg font-semibold text-gray-900">Проекты</h2>
            </div>
            <p className="text-sm text-gray-600">Управление заказами и задачами</p>
          </a>

          <a
            href="/tasks"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-purple-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✓</span>
              <h2 className="text-lg font-semibold text-gray-900">Задачи</h2>
            </div>
            <p className="text-sm text-gray-600">Матрица Эйзенхауэра и личные задачи</p>
          </a>

          <a
            href="/invoices"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📄</span>
              <h2 className="text-lg font-semibold text-gray-900">Счета</h2>
            </div>
            <p className="text-sm text-gray-600">Загрузка и распознавание счетов</p>
          </a>

          <a
            href="/suppliers"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏢</span>
              <h2 className="text-lg font-semibold text-gray-900">Поставщики</h2>
            </div>
            <p className="text-sm text-gray-600">База поставщиков и аналитика</p>
          </a>
        </div>
      </div>
    </div>
  );
}
