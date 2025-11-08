import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🏗️ [CREATE-PROJECT] Создание тестового проекта');

    const projectData = {
      id: '68356770-f98e-4895-a34c-aa62b513010a',
      name: 'Остекление торгового центра',
      address: 'г. Москва, ул. Ленина, д. 123',
      status: 'in_progress',
      description: 'Проект остекления фасада торгового центра площадью 2000 кв.м.',
      budget: 5000000,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select();

    if (error) {
      console.error('❌ [CREATE-PROJECT] Ошибка:', error);
      throw error;
    }

    console.log('✅ [CREATE-PROJECT] Проект создан:', data);
    return NextResponse.json({ success: true, project: data });

  } catch (error: any) {
    console.error('❌ [CREATE-PROJECT] Ошибка при создании проекта:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании проекта', details: error.message },
      { status: 500 }
    );
  }
}