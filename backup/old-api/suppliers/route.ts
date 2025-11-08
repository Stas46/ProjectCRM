import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
);

export async function GET() {
  try {
    console.log('📊 [SUPPLIERS-API] Получение списка поставщиков');
    
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('❌ [SUPPLIERS-API] Ошибка получения поставщиков:', error);
      return NextResponse.json({ error: 'Ошибка получения поставщиков' }, { status: 500 });
    }
    
    console.log('✅ [SUPPLIERS-API] Получено поставщиков:', suppliers.length);
    
    return NextResponse.json(suppliers || []);
    
  } catch (error: any) {
    console.error('❌ [SUPPLIERS-API] Ошибка:', error);
    return NextResponse.json({ 
      error: error.message || 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📊 [SUPPLIERS-API] Создание поставщика:', body);
    
    const { name, inn, category, description } = body;
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Название поставщика обязательно' }, { status: 400 });
    }
    
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        name: name.trim(),
        inn: inn?.trim() || null,
        category: category?.trim() || 'Доп. затраты',
        description: description?.trim() || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ [SUPPLIERS-API] Ошибка создания поставщика:', error);
      return NextResponse.json({ error: 'Ошибка создания поставщика' }, { status: 500 });
    }
    
    console.log('✅ [SUPPLIERS-API] Поставщик создан:', supplier.id);
    
    return NextResponse.json({ 
      success: true, 
      supplier
    });
    
  } catch (error: any) {
    console.error('❌ [SUPPLIERS-API] Ошибка создания поставщика:', error);
    return NextResponse.json({ 
      error: error.message || 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}