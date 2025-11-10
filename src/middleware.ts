import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // ВРЕМЕННО: пропускаем все запросы
  // Проверка авторизации происходит на клиенте через useEffect в компонентах
  return NextResponse.next();
  
  /* TODO: Настроить правильную работу с Supabase cookies
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
