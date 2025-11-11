'use client';

import AppLayout from '@/components/app-layout';
import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Bell, Eye, EyeOff, Save, Clock, LogOut, MessageCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'installer' | 'accountant' | 'viewer';
  avatar?: string;
  notificationsEnabled: boolean;
  telegram_id?: number;
  telegram_username?: string;
}

const roleLabels = {
  admin: 'Администратор',
  manager: 'Менеджер проектов',
  installer: 'Монтажник',
  accountant: 'Бухгалтер',
  viewer: 'Наблюдатель',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  
  const [telegramCode, setTelegramCode] = useState('');
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [telegramLinkError, setTelegramLinkError] = useState('');
  const [telegramLinkSuccess, setTelegramLinkSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      setProfile({
        id: profileData.id,
        name: profileData.full_name || user.email || 'Пользователь',
        email: user.email || '',
        phone: profileData.phone || '',
        role: profileData.role || 'viewer',
        notificationsEnabled: true,
        telegram_id: profileData.telegram_id,
        telegram_username: profileData.telegram_username,
      });
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: value,
      };
    });
  };
  
  const handleToggleNotifications = () => {
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        notificationsEnabled: !prev.notificationsEnabled,
      };
    });
  };
  
  const handleSaveProfile = () => {
    setIsSaving(true);
    
    // В реальном приложении здесь был бы API-запрос
    setTimeout(() => {
      setIsEditing(false);
      setIsSaving(false);
    }, 1000);
  };
  
  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    
    setIsSaving(true);
    
    // В реальном приложении здесь был бы API-запрос
    setTimeout(() => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsSaving(false);
    }, 1000);
  };
  
  const handleLinkTelegram = async () => {
    if (!telegramCode || telegramCode.length !== 6) {
      setTelegramLinkError('Введите 6-значный код из Telegram');
      return;
    }
    
    setIsLinkingTelegram(true);
    setTelegramLinkError('');
    setTelegramLinkSuccess('');
    
    try {
      // Получаем сессию для токена
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setTelegramLinkError('Необходима авторизация');
        setIsLinkingTelegram(false);
        return;
      }
      
      const response = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: telegramCode }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка привязки');
      }
      
      setTelegramLinkSuccess('✅ Telegram успешно привязан!');
      setTelegramCode('');
      
      // Обновить профиль через 2 секунды
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setTelegramLinkError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLinkingTelegram(false);
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Личный кабинет</h1>
        
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12">
            <div className="text-center text-gray-500">Загрузка профиля...</div>
          </div>
        ) : !profile ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12">
            <div className="text-center text-red-600">Ошибка загрузки профиля</div>
          </div>
        ) : (
        <>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-medium">
                    {getInitials(profile.name)}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{profile.name}</h2>
                <p className="text-sm text-blue-600 mb-3">{roleLabels[profile.role]}</p>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div className="flex items-center text-gray-600">
                    <Mail size={16} className="mr-2" />
                    <span>{profile.email}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Phone size={16} className="mr-2" />
                    <span>{profile.phone}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {isEditing ? 'Отмена' : 'Редактировать'}
                </button>
              </div>
            </div>
          </div>
          
          {isEditing && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Личные данные</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    ФИО
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profile.name}
                      onChange={handleProfileChange}
                      className="block w-full py-2.5 pl-10 pr-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profile.email}
                      onChange={handleProfileChange}
                      className="block w-full py-2.5 pl-10 pr-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Phone size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profile.phone}
                      onChange={handleProfileChange}
                      className="block w-full py-2.5 pl-10 pr-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
                  >
                    {isSaving ? (
                      <>
                        <Clock size={16} className="animate-spin mr-2" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        Сохранить изменения
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Изменение пароля</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Текущий пароль
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full py-2.5 pl-10 pr-10 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Новый пароль
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full py-2.5 pl-10 pr-10 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Подтверждение пароля
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full py-2.5 pl-10 pr-10 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={!currentPassword || !newPassword || !confirmPassword || isSaving}
                  className={`
                    inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                    ${(!currentPassword || !newPassword || !confirmPassword || isSaving)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300'
                    }
                  `}
                >
                  {isSaving ? (
                    <>
                      <Clock size={16} className="animate-spin mr-2" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Изменить пароль
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MessageCircle size={20} className="mr-2 text-blue-600" />
              Привязка Telegram
            </h3>
            
            {profile.telegram_id ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900 mb-2">
                    ✅ Telegram привязан
                  </p>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>ID: <code className="bg-white px-2 py-0.5 rounded">{profile.telegram_id}</code></div>
                    {profile.telegram_username && (
                      <div>Username: <code className="bg-white px-2 py-0.5 rounded">@{profile.telegram_username}</code></div>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="mb-2">Теперь вы можете управлять CRM через Telegram бота:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code className="bg-gray-100 px-1 py-0.5 rounded">/tasks</code> - список задач</li>
                    <li><code className="bg-gray-100 px-1 py-0.5 rounded">/projects</code> - список проектов</li>
                    <li>Или просто напишите: "какие задачи на сегодня?"</li>
                  </ul>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Как привязать Telegram:</strong>
                </p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Найдите бота в Telegram (имя бота из BotFather)</li>
                  <li>Отправьте команду <code className="bg-white px-1 py-0.5 rounded">/start</code></li>
                  <li>Скопируйте 6-значный код из сообщения</li>
                  <li>Введите код ниже и нажмите &quot;Привязать&quot;</li>
                </ol>
              </div>
              
              <div>
                <label htmlFor="telegram-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Код привязки из Telegram
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="telegram-code"
                    value={telegramCode}
                    onChange={(e) => setTelegramCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="flex-1 py-2.5 px-4 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleLinkTelegram}
                    disabled={isLinkingTelegram || telegramCode.length !== 6}
                    className={`
                      inline-flex items-center px-6 py-2.5 text-sm font-medium rounded-lg
                      ${(isLinkingTelegram || telegramCode.length !== 6)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300'
                      }
                    `}
                  >
                    {isLinkingTelegram ? (
                      <>
                        <Clock size={16} className="animate-spin mr-2" />
                        Проверка...
                      </>
                    ) : (
                      'Привязать'
                    )}
                  </button>
                </div>
                
                {telegramLinkError && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    ❌ {telegramLinkError}
                  </div>
                )}
                
                {telegramLinkSuccess && (
                  <div className="mt-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
                    {telegramLinkSuccess}
                  </div>
                )}
                
                <p className="mt-2 text-xs text-gray-500">
                  ⏰ Код действителен 10 минут
                </p>
              </div>
            </div>
            )}
          </div>
          
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Настройки</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Уведомления</h4>
                  <p className="text-sm text-gray-500">Получать уведомления о новых сообщениях и событиях</p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={profile.notificationsEnabled}
                    onChange={handleToggleNotifications}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-8">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
          >
            <LogOut size={16} className="mr-2" />
            Выйти из системы
          </button>
        </div>
        </>
        )}
      </div>
    </AppLayout>
  );
}