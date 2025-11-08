import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    
    console.log('✏️ [SUPPLIERS-API] Обновление поставщика:', id, updates);
    
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [SUPPLIERS-API] Ошибка обновления:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('✅ [SUPPLIERS-API] Поставщик обновлен:', supplier.id);
    
    return NextResponse.json(supplier);
    
  } catch (error: any) {
    console.error('❌ [SUPPLIERS-API] Ошибка:', error);
    return NextResponse.json({ 
      error: error.message || 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
