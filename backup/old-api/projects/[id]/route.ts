import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { id: projectId } = await params;

    console.log('🔍 [PROJECT-API] Получение проекта:', projectId);

    // Получаем проект
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(*),
        manager:employees!manager_id(id, name, position)
      `)
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('❌ [PROJECT-API] Ошибка получения проекта:', projectError);
      return NextResponse.json(
        { success: false, error: projectError.message },
        { status: 500 }
      );
    }

    if (!project) {
      console.log('❌ [PROJECT-API] Проект не найден:', projectId);
      return NextResponse.json(
        { success: false, error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Получаем количество задач
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'done');

    // Получаем команду проекта (пока заглушка)
    const team: any[] = [];

    // Получаем файлы проекта (пока заглушка)
    const files: any[] = [];

    console.log('✅ [PROJECT-API] Проект получен:', {
      id: project.id,
      title: project.title,
      status: project.status,
      totalTasks,
      completedTasks,
      manager: project.manager
    });

    // Функция для получения инициалов
    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        description: project.description || '',
        status: project.status,
        start_date: project.start_date,
        due_date: project.due_date,
        budget: project.budget,
        address: project.address,
        client: project.client,
        manager: project.manager ? {
          id: project.manager.id,
          name: project.manager.name,
          initials: getInitials(project.manager.name),
          position: project.manager.position
        } : null,
        tasks_count: totalTasks || 0,
        tasks_completed: completedTasks || 0,
        team,
        files
      }
    });

  } catch (error) {
    console.error('❌ [PROJECT-API] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
