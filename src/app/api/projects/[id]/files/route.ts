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

// Функция транслитерации кириллицы
function transliterate(text: string): string {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '',
    'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    ' ': '_', '№': 'N'
  };
  
  let result = '';
  for (const char of text) {
    if (map[char] !== undefined) {
      result += map[char];
    } else if (/[a-zA-Z0-9._-]/.test(char)) {
      result += char;
    } else {
      result += '_';
    }
  }
  return result;
}

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

    console.log(`📂 GET /api/projects/${projectId}/files`, { folder });

    // Получаем файлы проекта
    let query = supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Фильтр по папке
    if (folder) {
      console.log(`📁 Фильтр по папке: ${folder}`);
      query = query.eq('folder', folder);
    }

    const { data: files, error } = await query;

    if (error) {
      console.error('❌ Ошибка получения файлов:', error);
      return NextResponse.json({ error: 'Ошибка загрузки файлов' }, { status: 500 });
    }

    console.log(`✅ Найдено файлов: ${files?.length || 0}`);

    // Получаем список папок из таблицы project_folders (пустые папки) 
    // и из файлов (папки с файлами)
    const { data: emptyFolders } = await supabase
      .from('project_folders')
      .select('folder_name, folder_path')
      .eq('project_id', projectId);

    const { data: foldersData } = await supabase
      .from('project_files')
      .select('folder')
      .eq('project_id', projectId)
      .not('folder', 'is', null);

    // Объединяем папки из обеих источников
    const folderSet = new Set<string>();
    
    // Добавляем пустые папки
    emptyFolders?.forEach(f => folderSet.add(f.folder_path));
    
    // Добавляем папки с файлами
    foldersData?.forEach(f => f.folder && folderSet.add(f.folder));

    // Фильтруем папки по текущему уровню
    // Если folder не указана - показываем папки верхнего уровня (без слэшей)
    // Если folder указана - показываем подпапки этой папки
    let filteredFolders = Array.from(folderSet);
    
    if (!folder) {
      // Показываем только папки верхнего уровня (без "/" в пути)
      filteredFolders = filteredFolders.filter(f => !f.includes('/'));
    } else {
      // Показываем подпапки текущей папки
      const prefix = folder + '/';
      filteredFolders = filteredFolders
        .filter(f => f.startsWith(prefix))
        .filter(f => {
          // Только прямые подпапки (не вложенные глубже)
          const rest = f.substring(prefix.length);
          return !rest.includes('/');
        });
    }

    const folders = filteredFolders.map(folderPath => {
      // Считаем файлы в этой папке и всех подпапках
      const allFiles = files || [];
      const fileCount = allFiles.filter(f => 
        f.folder === folderPath || (f.folder && f.folder.startsWith(folderPath + '/'))
      ).length;
      
      return {
        name: folderPath.split('/').pop() || folderPath,
        path: folderPath,
        file_count: fileCount
      };
    });

    console.log(`📁 Найдено папок: ${folders.length}`, folders);

    return NextResponse.json({
      success: true,
      files: files || [],
      folders
    });

  } catch (error) {
    console.error('❌ Ошибка GET /api/projects/[id]/files:', error);
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
      console.log('❌ Файл не найден в FormData');
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    console.log(`� POST /api/projects/${projectId}/files`);
    console.log(`📄 Файл: ${file.name}, размер: ${file.size}, тип: ${file.type}`);
    console.log(`📁 Папка: ${folder || 'root'}, пользователь: ${userId || 'unknown'}`);

    // Формируем путь к файлу
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const sanitizedName = transliterate(baseName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalFileName = `${timestamp}_${sanitizedName}.${fileExt}`;
    const folderPath = folder ? `${folder}` : '';
    const filePath = folderPath 
      ? `projects/${projectId}/${folderPath}/${finalFileName}`
      : `projects/${projectId}/${finalFileName}`;

    console.log(`🗂️ Путь в Storage: ${filePath}`);

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

    console.log(`🎨 MIME тип: ${contentType}`);

    // Загружаем в Storage
    const buffer = await file.arrayBuffer();
    console.log(`📦 Буфер получен, размер: ${buffer.byteLength} байт`);
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('invoice-files')
      .upload(filePath, buffer, {
        contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Ошибка загрузки в Storage:', uploadError);
      return NextResponse.json({ 
        error: 'Ошибка загрузки файла в Storage' 
      }, { status: 500 });
    }

    console.log(`✅ Файл загружен в Storage:`, uploadData);

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('invoice-files')
      .getPublicUrl(filePath);

    console.log(`🔗 Публичный URL: ${publicUrl}`);

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

    console.log(`💾 Сохраняем метаданные в БД:`, newFile);

    const { data: savedFile, error: dbError } = await supabase
      .from('project_files')
      .insert(newFile)
      .select()
      .single();

    if (dbError) {
      console.error('❌ Ошибка сохранения метаданных в БД:', dbError);
      // Удаляем файл из Storage если не удалось сохранить в БД
      console.log(`🗑️ Удаляем файл из Storage: ${filePath}`);
      await supabase.storage.from('invoice-files').remove([filePath]);
      return NextResponse.json({ 
        error: 'Ошибка сохранения метаданных файла' 
      }, { status: 500 });
    }

    console.log(`✅ Файл успешно загружен и сохранен!`);
    console.log(`📊 Данные файла:`, savedFile);

    return NextResponse.json({
      success: true,
      file: savedFile
    });

  } catch (error) {
    console.error('❌ Критическая ошибка POST /api/projects/[id]/files:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

// ============================================
// DELETE - Удалить файл
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

    console.log(`🗑️ DELETE /api/projects/${projectId}/files?file_id=${fileId}`);

    if (!fileId) {
      console.log('❌ ID файла не указан');
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
      console.log('❌ Файл не найден:', fetchError);
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    console.log(`📄 Удаляем файл: ${file.file_name} (${file.file_path})`);

    // Удаляем из Storage
    const { error: storageError } = await supabase
      .storage
      .from('invoice-files')
      .remove([file.file_path]);

    if (storageError) {
      console.error('⚠️ Ошибка удаления из Storage:', storageError);
    } else {
      console.log('✅ Файл удален из Storage');
    }

    // Удаляем из БД
    const { error: dbError } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('❌ Ошибка удаления из БД:', dbError);
      return NextResponse.json({ 
        error: 'Ошибка удаления файла' 
      }, { status: 500 });
    }

    console.log(`✅ Файл удален из БД: ${file.file_name}`);
    console.log(`🗑️ Удаление завершено успешно`);

    return NextResponse.json({
      success: true,
      message: 'Файл успешно удален'
    });

  } catch (error) {
    console.error('❌ ОШИБКА DELETE /api/projects/[id]/files:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

// ============================================
// PATCH - Переместить файл в другую папку
// ============================================
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: projectId } = await context.params;
    const { file_id, target_folder } = await request.json();

    console.log(`🔄 PATCH /api/projects/${projectId}/files - перемещение файла ${file_id} в папку: ${target_folder || 'root'}`);

    if (!file_id) {
      return NextResponse.json({ error: 'ID файла не указан' }, { status: 400 });
    }

    // Получаем информацию о файле
    const { data: file, error: fetchError } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', file_id)
      .eq('project_id', projectId)
      .single();

    if (fetchError || !file) {
      console.log('❌ Файл не найден:', fetchError);
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    console.log(`📄 Файл: ${file.file_name}, текущая папка: ${file.folder || 'root'}`);

    // Формируем новый путь в Storage
    const timestamp = Date.now();
    const fileExt = file.file_name.split('.').pop()?.toLowerCase();
    const baseName = file.file_name.substring(0, file.file_name.lastIndexOf('.')) || file.file_name;
    const sanitizedName = transliterate(baseName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalFileName = `${timestamp}_${sanitizedName}.${fileExt}`;
    
    // Транслитерируем название папки для валидного Storage path
    const newFolderPath = target_folder ? transliterate(target_folder).replace(/[^a-zA-Z0-9/_-]/g, '_') : '';
    const newFilePath = newFolderPath 
      ? `projects/${projectId}/${newFolderPath}/${finalFileName}`
      : `projects/${projectId}/${finalFileName}`;

    console.log(`🗂️ Перемещение из папки "${file.folder || 'root'}" в папку "${target_folder || 'root'}"`);
    console.log(`🗂️ Storage path: ${newFilePath}`);

    // Копируем файл в новое место в Storage
    const { data: copyData, error: copyError } = await supabase
      .storage
      .from('invoice-files')
      .copy(file.file_path, newFilePath);

    if (copyError) {
      console.error('❌ Ошибка копирования файла:', copyError);
      return NextResponse.json({ 
        error: 'Ошибка перемещения файла' 
      }, { status: 500 });
    }

    console.log(`✅ Файл скопирован в новое место`);

    // Получаем новый публичный URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('invoice-files')
      .getPublicUrl(newFilePath);

    // Обновляем запись в БД
    const { data: updatedFile, error: updateError } = await supabase
      .from('project_files')
      .update({
        folder: target_folder || null,
        file_path: newFilePath,
        public_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', file_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Ошибка обновления БД:', updateError);
      // Откатываем - удаляем скопированный файл
      await supabase.storage.from('invoice-files').remove([newFilePath]);
      return NextResponse.json({ 
        error: 'Ошибка обновления метаданных' 
      }, { status: 500 });
    }

    console.log(`✅ Метаданные обновлены`);

    // Удаляем старый файл из Storage
    const { error: deleteError } = await supabase
      .storage
      .from('invoice-files')
      .remove([file.file_path]);

    if (deleteError) {
      console.error('⚠️ Ошибка удаления старого файла:', deleteError);
    } else {
      console.log(`✅ Старый файл удален`);
    }

    console.log(`🔄 Перемещение завершено успешно`);

    return NextResponse.json({
      success: true,
      file: updatedFile
    });

  } catch (error) {
    console.error('❌ ОШИБКА PATCH /api/projects/[id]/files:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
