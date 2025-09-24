import { supabase } from '@/lib/supabase';
import { Task, NewTask, UpdateTask } from '@/types/task';

// Получение всех задач
export async function getAllTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка при получении задач:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Исключение при получении задач:', err);
    return [];
  }
}

// Получение задач по ID проекта
export async function getTasksByProjectId(projectId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Ошибка при получении задач для проекта ${projectId}:`, error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error(`Исключение при получении задач для проекта ${projectId}:`, err);
    return [];
  }
}

// Получение задачи по ID
export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Ошибка при получении задачи с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при получении задачи с ID ${id}:`, err);
    return null;
  }
}

// Создание новой задачи
export async function createTask(task: NewTask): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании задачи:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Исключение при создании задачи:', err);
    return null;
  }
}

// Обновление задачи
export async function updateTask(id: string, updates: UpdateTask): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Ошибка при обновлении задачи с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при обновлении задачи с ID ${id}:`, err);
    return null;
  }
}

// Удаление задачи
export async function deleteTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Ошибка при удалении задачи с ID ${id}:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Исключение при удалении задачи с ID ${id}:`, err);
    return false;
  }
}

// Алиас для getTasksByProjectId
export const getProjectTasks = getTasksByProjectId;

// Функции для работы с файлами и комментариями

/**
 * Загрузить файл к задаче
 * @param taskId - ID задачи
 * @param file - Файл для загрузки
 * @returns Информация о загруженном файле
 */
export async function uploadTaskAttachment(taskId: string, file: File) {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `tasks/${taskId}/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    
    // Загрузка файла в хранилище
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Ошибка при загрузке файла:', uploadError);
      return { error: uploadError };
    }
    
    // Получение публичной ссылки на файл
    const { data: publicUrlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);
    
    // Запись в базу данных
    const { data, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        name: file.name,
        type: file.type,
        size: file.size,
        path: filePath,
        url: publicUrlData.publicUrl
      })
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при сохранении информации о файле:', error);
      
      // Удаляем файл из хранилища, если не удалось сохранить в базу
      await supabase.storage
        .from('attachments')
        .remove([filePath]);
      
      return { error };
    }
    
    // Форматируем размер для отображения
    const formattedSize = file.size < 1024 * 1024 
      ? `${Math.round(file.size / 1024)} KB` 
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    
    return {
      data: {
        id: data.id,
        name: file.name,
        type: file.type.split('/')[1] || 'unknown',
        size: formattedSize,
        uploadDate: new Date().toISOString().split('T')[0],
        url: publicUrlData.publicUrl,
        path: filePath
      }
    };
  } catch (error) {
    console.error('Ошибка при загрузке файла к задаче:', error);
    return { error };
  }
}

/**
 * Удалить файл из задачи
 * @param fileId - ID файла
 * @param filePath - Путь к файлу в хранилище
 */
export async function deleteTaskAttachment(fileId: string, filePath: string) {
  try {
    // Удаление файла из хранилища
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([filePath]);
    
    if (storageError) {
      console.error('Ошибка при удалении файла из хранилища:', storageError);
      return { error: storageError };
    }
    
    // Удаление записи из базы данных
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', fileId);
    
    if (dbError) {
      console.error('Ошибка при удалении информации о файле из базы:', dbError);
      return { error: dbError };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка при удалении файла из задачи:', error);
    return { error };
  }
}

/**
 * Добавить комментарий к задаче
 * @param taskId - ID задачи
 * @param text - Текст комментария
 * @param userId - ID пользователя
 * @param file - Вложение (опционально)
 */
export async function addTaskComment(taskId: string, text: string, userId: string, file?: File) {
  try {
    // Создание комментария
    const { data: commentData, error: commentError } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        text: text,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (commentError) {
      console.error('Ошибка при создании комментария:', commentError);
      return { error: commentError };
    }
    
    // Если есть файл, загружаем его
    if (file) {
      const fileExt = file.name.split('.').pop();
      const filePath = `tasks/${taskId}/comments/${commentData.id}/${Date.now()}.${fileExt}`;
      
      // Загрузка файла в хранилище
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Ошибка при загрузке файла к комментарию:', uploadError);
        return { data: commentData, attachmentError: uploadError };
      }
      
      // Получение публичной ссылки на файл
      const { data: publicUrlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);
      
      // Запись в базу данных
      const { error: attachmentError } = await supabase
        .from('comment_attachments')
        .insert({
          comment_id: commentData.id,
          name: file.name,
          type: file.type,
          size: file.size,
          path: filePath,
          url: publicUrlData.publicUrl
        });
      
      if (attachmentError) {
        console.error('Ошибка при сохранении информации о файле комментария:', attachmentError);
        return { data: commentData, attachmentError };
      }
    }
    
    return { data: commentData };
  } catch (error) {
    console.error('Ошибка при добавлении комментария к задаче:', error);
    return { error };
  }
}

// ============= ВРЕМЕННЫЕ МОК-ФУНКЦИИ ДЛЯ РАЗРАБОТКИ (РЕЖИМ ДЕМО) =============

/**
 * Мок функция для загрузки файла (режим демо)
 */
export async function mockUploadTaskAttachment(taskId: string, file: File) {
  // Имитация задержки загрузки
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Создаем временный URL для демонстрации
  const fileUrl = URL.createObjectURL(file);
  
  // Формируем размер файла для отображения
  const formattedSize = file.size < 1024 * 1024 
    ? `${Math.round(file.size / 1024)} KB` 
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  
  return {
    data: {
      id: `file-${Date.now()}`,
      name: file.name,
      type: file.type.split('/')[1] || 'unknown',
      size: formattedSize,
      uploadDate: new Date().toISOString().split('T')[0],
      url: fileUrl,
      path: `demo/tasks/${taskId}/${file.name}` // Демо-путь
    }
  };
}

/**
 * Мок функция для удаления файла (режим демо)
 */
export async function mockDeleteTaskAttachment(fileId: string, filePath: string) {
  // Имитация задержки удаления
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true };
}

/**
 * Мок функция для добавления комментария (режим демо)
 */
export async function mockAddTaskComment(
  taskId: string, 
  text: string, 
  userId: string,
  userName: string,
  userInitials: string,
  file?: File
) {
  // Имитация задержки
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Если есть файл, "загружаем" его
  let attachmentData = undefined;
  
  if (file) {
    // Имитация загрузки файла
    await new Promise(resolve => setTimeout(resolve, 700));
    
    attachmentData = [{
      id: `attachment-${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type.split('/')[1] || 'unknown',
    }];
  }
  
  // Создаем объект комментария
  const commentData = {
    id: `comment-${Date.now()}`,
    author: {
      id: userId,
      name: userName,
      initials: userInitials,
    },
    text,
    createdAt: new Date().toISOString(),
    attachments: attachmentData
  };
  
  return { data: commentData };
}

// Используем реальные или мок-функции в зависимости от наличия переменной окружения
const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Экспортируем функции с правильными реализациями
export const uploadTaskAttachment = isDemoMode ? mockUploadTaskAttachment : uploadTaskAttachment;
export const deleteTaskAttachment = isDemoMode ? mockDeleteTaskAttachment : deleteTaskAttachment;
export const addTaskComment = isDemoMode ? mockAddTaskComment : addTaskComment;
