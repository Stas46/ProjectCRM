// ============================================
// API Endpoint для управления файлами проектов
// Путь: src/app/api/projects/[id]/files/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ProjectFile, CreateProjectFile } from '@/types/project-file';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================
// GET - Получить список файлов проекта
// ============================================
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: projectId } = await context.params;
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');

    // Получаем файлы проекта
    let query = supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Фильтр по папке
    if (folder) {
      query = query.eq('folder', folder);
    }

    const { data: files, error } = await query;

    if (error) {
      console.error('Ошибка получения файлов:', error);
      return NextResponse.json({ error: 'Ошибка загрузки файлов' }, { status: 500 });
    }

    // Получаем список папок
    const { data: foldersData } = await supabase
      .from('project_files')
      .select('folder')
      .eq('project_id', projectId)
      .not('folder', 'is', null);

    const folders = [...new Set(foldersData?.map(f => f.folder) || [])].map(folderName => ({
      name: folderName,
      path: folderName,
      file_count: files?.filter(f => f.folder === folderName).length || 0
    }));

    return NextResponse.json({
      success: true,
      files: files || [],
      folders
    });

  } catch (error) {
    console.error('Ошибка GET /api/projects/[id]/files:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

// ============================================
// POST - Загрузить файл в проект
// ============================================
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: projectId } = await context.params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string | null;
    const userId = formData.get('user_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    console.log(`📁 Загрузка файла в проект ${projectId}: ${file.name}`);

    // Формируем путь к файлу
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const sanitizedName = file.name.replace(/[^a-zA-Zа-яА-Я0-9._-]/g, '_');
    const folderPath = folder ? `${folder}/` : '';
    const filePath = `projects/${projectId}/${folderPath}${timestamp}_${sanitizedName}`;

    // Определяем MIME тип
    const mimeTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/octet-stream',
      'xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
      'doc': 'application/octet-stream',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed'
    };

    const contentType = mimeTypeMap[fileExt || ''] || 'application/octet-stream';

    // Загружаем в Storage
    const buffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('invoice-files')
      .upload(filePath, buffer, {
        contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('Ошибка загрузки в Storage:', uploadError);
      return NextResponse.json({ 
        error: 'Ошибка загрузки файла в Storage' 
      }, { status: 500 });
    }

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('invoice-files')
      .getPublicUrl(filePath);

    // Сохраняем метаданные в БД
    const newFile: CreateProjectFile = {
      project_id: projectId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type || contentType,
      folder: folder || undefined,
      uploaded_by: userId || undefined,
      public_url: publicUrl
    };

    const { data: savedFile, error: dbError } = await supabase
      .from('project_files')
      .insert(newFile)
      .select()
      .single();

    if (dbError) {
      console.error('Ошибка сохранения метаданных:', dbError);
      // Удаляем файл из Storage если не удалось сохранить в БД
      await supabase.storage.from('invoice-files').remove([filePath]);
      return NextResponse.json({ 
        error: 'Ошибка сохранения метаданных файла' 
      }, { status: 500 });
    }

    console.log(`✅ Файл загружен: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      file: savedFile
    });

  } catch (error) {
    console.error('Ошибка POST /api/projects/[id]/files:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

// ============================================
// DELETE - Удалить файл
// ============================================
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: projectId } = await context.params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('file_id');

    if (!fileId) {
      return NextResponse.json({ error: 'ID файла не указан' }, { status: 400 });
    }

    // Получаем информацию о файле
    const { data: file, error: fetchError } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', fileId)
      .eq('project_id', projectId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    // Удаляем из Storage
    const { error: storageError } = await supabase
      .storage
      .from('invoice-files')
      .remove([file.file_path]);

    if (storageError) {
      console.error('Ошибка удаления из Storage:', storageError);
    }

    // Удаляем из БД
    const { error: dbError } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Ошибка удаления из БД:', dbError);
      return NextResponse.json({ 
        error: 'Ошибка удаления файла' 
      }, { status: 500 });
    }

    console.log(`🗑️ Файл удален: ${file.file_name}`);

    return NextResponse.json({
      success: true,
      message: 'Файл успешно удален'
    });

  } catch (error) {
    console.error('Ошибка DELETE /api/projects/[id]/files:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
