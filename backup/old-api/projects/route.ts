import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    console.log('📋 [PROJECTS-API] Получение всех проектов');
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*');

    if (error) {
      console.error('❌ [PROJECTS-API] Ошибка запроса:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ [PROJECTS-API] Получено проектов: ${projects?.length || 0}`);
    
    return NextResponse.json(projects || []);
  } catch (error) {
    console.error('❌ [PROJECTS-API] Неожиданная ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}