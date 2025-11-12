// API для создания папок в проектах
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: projectId } = await context.params;
    const { folder_name, parent_folder } = await request.json();

    if (!folder_name) {
      return NextResponse.json({ error: 'Название папки обязательно' }, { status: 400 });
    }

    console.log(`📁 Создание папки: ${folder_name} в проекте ${projectId}`);

    // Формируем полный путь к папке
    const folderPath = parent_folder 
      ? `${parent_folder}/${folder_name}`
      : folder_name;

    // Создаем запись о папке в БД (как маркер что папка существует)
    const { data, error } = await supabase
      .from('project_folders')
      .insert({
        project_id: projectId,
        folder_path: folderPath,
        folder_name: folder_name,
        parent_folder: parent_folder || null
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка создания папки:', error);
      return NextResponse.json({ 
        error: 'Ошибка создания папки' 
      }, { status: 500 });
    }

    console.log(`✅ Папка создана:`, data);

    return NextResponse.json({
      success: true,
      folder: data
    });

  } catch (error) {
    console.error('❌ ОШИБКА POST /api/projects/[id]/folders:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
