import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Получаем пользователя из токена
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const authHeader = req.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - no token' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Получаем параметры фильтрации
    const { searchParams } = new URL(req.url);
    const agentType = searchParams.get('agent_type');
    const actionType = searchParams.get('action_type');
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Формируем запрос
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabaseAdmin
      .from('agent_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agentType) {
      query = query.eq('agent_type', agentType);
    }
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching logs:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: data,
      total: count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('❌ Agent logs API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
