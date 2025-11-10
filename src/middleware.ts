import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req: NextRequest) {
  // Публичные роуты (доступны без авторизации)
  const publicPaths = ['/login', '/api'];
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

  // Пропускаем публичные пути
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Проверяем наличие Supabase auth токенов
  const allCookies = req.cookies.getAll();
  const hasAuthToken = allCookies.some(cookie => 
    cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
  );

  // Если нет токена - редирект на логин
  if (!hasAuthToken) {
    console.log('🔒 No auth token, redirecting to /login');
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Для админ-панели проверяем роль
  if (req.nextUrl.pathname.startsWith('/admin')) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Получаем токен из cookies
      const authToken = allCookies.find(c => c.name.startsWith('sb-') && c.name.includes('auth-token'));
      if (!authToken) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      const tokenData = JSON.parse(authToken.value);
      const accessToken = tokenData?.access_token;

      if (accessToken) {
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile?.role !== 'admin') {
            console.log('❌ User is not admin, redirecting to /');
            return NextResponse.redirect(new URL('/', req.url));
          }
        }
      }
    } catch (error) {
      console.error('Middleware auth error:', error);
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
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
