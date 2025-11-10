import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ВРЕМЕННО ОТКЛЮЧЕНО для диагностики
  console.log('🔍 Middleware:', req.nextUrl.pathname);
  
  // Публичные роуты (доступны без авторизации)
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

  // Получаем все cookies для диагностики
  const allCookies = req.cookies.getAll();
  console.log('🍪 Cookies:', allCookies.map(c => c.name));

  // Ищем токен Supabase
  const authCookie = allCookies.find(c => c.name.includes('auth-token'));
  console.log('🔑 Auth cookie:', authCookie?.name);

  // Временно пропускаем все запросы без проверки
  return res;

  /* ВРЕМЕННО ОТКЛЮЧЕНО - вся проверка авторизации
  // Если нет токена и это защищенный роут - редирект на логин
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Если есть токен и пользователь на странице логина - редирект на главную
  if (token && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Для админ-панели проверяем роль
  if (req.nextUrl.pathname.startsWith('/admin') && token) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role !== 'admin') {
          return NextResponse.redirect(new URL('/', req.url));
        }
      }
    } catch (error) {
      console.error('Middleware auth error:', error);
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return res;
  */
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
