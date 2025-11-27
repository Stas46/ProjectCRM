import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // Публичные роуты (доступны без авторизации)
  const publicPaths = ['/login', '/api'];
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

  // Пропускаем публичные пути
  if (isPublicPath) {
    return NextResponse.next();
  }

  // ВРЕМЕННО: Пропускаем все запросы
  // Проверка авторизации происходит на клиенте через useEffect в компонентах
  // и в API routes через Authorization header
  // 
  // TODO: Настроить правильную работу с Supabase cookies для middleware
  // Проблема: клиентский Supabase использует localStorage, а middleware проверяет cookies
  // Решение: либо перевести клиент на cookies через @supabase/ssr,
  // либо оставить проверку авторизации на клиенте и в API routes
  return NextResponse.next();
  
  /* Закомментировано до настройки cookies
  // Создаем серверный клиент Supabase для проверки сессии
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase credentials not configured in middleware');
    return NextResponse.next();
  }

  // Создаем response для работы с cookies
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Создаем серверный клиент Supabase
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        req.cookies.set({
          name,
          value,
          ...options,
        });
        res.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: any) {
        req.cookies.set({
          name,
          value: '',
          ...options,
        });
        res.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  // Проверяем сессию пользователя
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Если пользователь не авторизован - редирект на логин
  if (!user || error) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Пользователь авторизован - пропускаем запрос
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
