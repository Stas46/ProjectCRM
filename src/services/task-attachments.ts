import { supabase } from '@/lib/supabase';

/**
 * Типы для работы с файлами задач
 */
export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  url: string;
  path?: string; // Путь в хранилище
}

export interface TaskComment {
  id: string;
  author: {
    id: string;
    name: string;
    initials: string;
  };
  text: string;
  createdAt: string;
  attachments?: TaskAttachment[];
}

/**
 * Проверка, запущено ли приложение в демо-режиме
 */
const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Сервис для работы с файлами и комментариями задач
 */
export const taskAttachmentService = {
  /**
   * Загрузить файл к задаче
   * @param taskId - ID задачи
   * @param file - Файл для загрузки
   * @returns Информация о загруженном файле
   */
  async uploadFile(taskId: string, file: File): Promise<{ data?: TaskAttachment, error?: any }> {
    if (isDemoMode) {
      return this.mockUploadFile(taskId, file);
    }
    
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
  },
  
  /**
   * Удалить файл из задачи
   * @param fileId - ID файла
   * @param filePath - Путь к файлу в хранилище
   */
  async deleteFile(fileId: string, filePath: string): Promise<{ success?: boolean, error?: any }> {
    if (isDemoMode) {
      return this.mockDeleteFile(fileId, filePath);
    }
    
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
  },
  
  /**
   * Добавить комментарий к задаче
   * @param taskId - ID задачи
   * @param text - Текст комментария
   * @param userId - ID пользователя
   * @param userName - Имя пользователя
   * @param userInitials - Инициалы пользователя
   * @param file - Вложение (опционально)
   */
  async addComment(
    taskId: string, 
    text: string, 
    userId: string,
    userName: string,
    userInitials: string,
    file?: File
  ): Promise<{ data?: TaskComment, error?: any }> {
    if (isDemoMode) {
      return this.mockAddComment(taskId, text, userId, userName, userInitials, file);
    }
    
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
      let attachmentData: TaskAttachment[] | undefined;
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `tasks/${taskId}/comments/${commentData.id}/${Date.now()}.${fileExt}`;
        
        // Загрузка файла в хранилище
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Ошибка при загрузке файла к комментарию:', uploadError);
          return { data: commentData, error: uploadError };
        }
        
        // Получение публичной ссылки на файл
        const { data: publicUrlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);
        
        // Запись в базу данных
        const { data: attachmentDbData, error: attachmentError } = await supabase
          .from('comment_attachments')
          .insert({
            comment_id: commentData.id,
            name: file.name,
            type: file.type,
            size: file.size,
            path: filePath,
            url: publicUrlData.publicUrl
          })
          .select()
          .single();
        
        if (attachmentError) {
          console.error('Ошибка при сохранении информации о файле комментария:', attachmentError);
          return { data: commentData, error: attachmentError };
        }
        
        if (attachmentDbData) {
          // Формируем объект вложения
          const formattedSize = file.size < 1024 * 1024 
            ? `${Math.round(file.size / 1024)} KB` 
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
          
          attachmentData = [{
            id: attachmentDbData.id,
            name: file.name,
            type: file.type.split('/')[1] || 'unknown',
            size: formattedSize,
            uploadDate: new Date().toISOString().split('T')[0],
            url: publicUrlData.publicUrl,
            path: filePath
          }];
        }
      }
      
      // Получаем информацию о пользователе
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, initials')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error('Ошибка при получении информации о пользователе:', userError);
      }
      
      // Формируем объект комментария
      const commentResult: TaskComment = {
        id: commentData.id,
        author: {
          id: userId,
          name: userData?.name || userName,
          initials: userData?.initials || userInitials,
        },
        text: commentData.text,
        createdAt: commentData.created_at,
        attachments: attachmentData
      };
      
      return { data: commentResult };
    } catch (error) {
      console.error('Ошибка при добавлении комментария к задаче:', error);
      return { error };
    }
  },
  
  // ============= ВРЕМЕННЫЕ МОК-ФУНКЦИИ ДЛЯ РАЗРАБОТКИ (РЕЖИМ ДЕМО) =============
  
  /**
   * Мок функция для загрузки файла (режим демо)
   */
  async mockUploadFile(taskId: string, file: File) {
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
  },
  
  /**
   * Мок функция для удаления файла (режим демо)
   */
  async mockDeleteFile(fileId: string, filePath: string) {
    // Имитация задержки удаления
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { success: true };
  },
  
  /**
   * Мок функция для добавления комментария (режим демо)
   */
  async mockAddComment(
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
      
      // Создаем временный URL для демонстрации
      const fileUrl = URL.createObjectURL(file);
      
      attachmentData = [{
        id: `attachment-${Date.now()}`,
        name: file.name,
        type: file.type.split('/')[1] || 'unknown',
        size: file.size < 1024 * 1024 
          ? `${Math.round(file.size / 1024)} KB` 
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadDate: new Date().toISOString().split('T')[0],
        url: fileUrl
      }];
    }
    
    // Создаем объект комментария
    const commentData: TaskComment = {
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
};