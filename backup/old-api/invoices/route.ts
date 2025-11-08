import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [INVOICES-API] Получение всех счетов');

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        project:projects!invoices_project_id_fkey (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [INVOICES-API] Ошибка:', error);
      throw error;
    }

    console.log(`✅ [INVOICES-API] Получено счетов: ${data?.length || 0}`);
    
    // Логируем первый счет для диагностики
    if (data && data.length > 0) {
      console.log('🔍 [INVOICES-API] Первый счет:', JSON.stringify(data[0], null, 2));
    }

    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('❌ [INVOICES-API] Ошибка при получении счетов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении счетов', details: error.message },
      { status: 500 }
    );
  }
}