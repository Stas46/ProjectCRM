import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { linkTelegramByCode } from '@/lib/telegram-helper';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Код привязки не указан' },
        { status: 400 }
      );
    }

    // Очистка кода (только цифры, 6 символов)
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      return NextResponse.json(
        { error: 'Код должен содержать 6 цифр' },
        { status: 400 }
      );
    }

    // Получаем текущего пользователя через токен из Authorization header
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Получаем токен из заголовка Authorization
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      console.error('❌ No access token in Authorization header');
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Привязываем Telegram через код
    const result = await linkTelegramByCode(cleanCode, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Не удалось привязать Telegram' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram успешно привязан',
      telegram_id: result.telegram_id,
      telegram_username: result.telegram_username
    });
  } catch (error) {
    console.error('Error linking Telegram:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
