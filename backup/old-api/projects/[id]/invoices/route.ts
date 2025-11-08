import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    
    console.log('📊 [INVOICES-API] Получение счетов для проекта:', projectId);
    
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ [INVOICES-API] Ошибка получения счетов:', error);
      return NextResponse.json({ error: 'Ошибка получения счетов' }, { status: 500 });
    }
    
    console.log('✅ [INVOICES-API] Получено счетов:', invoices.length);
    
    return NextResponse.json({ 
      success: true, 
      invoices: invoices || [] 
    });
    
  } catch (error: any) {
    console.error('❌ [INVOICES-API] Ошибка:', error);
    return NextResponse.json({ 
      error: error.message || 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}