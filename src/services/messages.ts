import { supabase } from '@/lib/supabase';
import { ProjectMessage, MessageAttachment } from '@/types/message';

interface MessageRecord {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  users: {
    id: string;
    email: string;
    raw_user_meta_data: any;
  };
}

/**
 * Получение всех сообщений для проекта
 * @param projectId - ID проекта
 */
export const getProjectMessages = async (projectId: string): Promise<ProjectMessage[]> => {
  try {
    // Получение сообщений проекта
    const { data: messages, error } = await supabase
      .from('project_messages')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        auth.users!user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Ошибка при получении сообщений:', error);
      throw error;
    }

    // Получение вложений для сообщений
    const messageIds = messages.map(msg => msg.id);
    const { data: attachments, error: attachmentsError } = await supabase
      .from('message_attachments')
      .select('*')
      .in('message_id', messageIds);

    if (attachmentsError) {
      console.error('Ошибка при получении вложений:', attachmentsError);
      throw attachmentsError;
    }

    // Форматирование сообщений с вложениями
    const formattedMessages: ProjectMessage[] = messages.map(message => {
      const messageAttachments = attachments
        ? attachments.filter(att => att.message_id === message.id)
        : [];
      
      // Извлечение информации о пользователе из raw_user_meta_data
      const userMetadata = message.users?.raw_user_meta_data || {};
      const userName = userMetadata.name || userMetadata.full_name || 'Пользователь';
      
      // Создание инициалов из имени
      const nameParts = userName.split(' ');
      const initials = nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[1][0]}`
        : userName.substring(0, 2);

      return {
        id: message.id,
        content: message.content,
        createdAt: message.created_at,
        updatedAt: message.updated_at,
        user: {
          id: message.user_id,
          email: message.users?.email,
          name: userName,
          initials: initials.toUpperCase()
        },
        attachments: messageAttachments.map(att => ({
          id: att.id,
          fileName: att.file_name,
          fileType: att.file_type,
          fileSize: att.file_size,
          filePath: att.file_path,
          publicUrl: att.public_url
        }))
      };
    });

    return formattedMessages;
  } catch (error) {
    console.error('Ошибка при получении сообщений проекта:', error);
    throw error;
  }
};

/**
 * Создание нового сообщения в чате проекта
 * @param projectId - ID проекта
 * @param content - Текст сообщения
 * @param userId - ID пользователя (автора сообщения)
 */
export const createProjectMessage = async (
  projectId: string,
  content: string,
  userId: string
): Promise<ProjectMessage> => {
  try {
    const { data, error } = await supabase
      .from('project_messages')
      .insert({
        project_id: projectId,
        user_id: userId,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании сообщения:', error);
      throw error;
    }

    // Получение информации о пользователе
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('email, raw_user_meta_data')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Ошибка при получении данных пользователя:', userError);
    }

    // Извлечение информации о пользователе из raw_user_meta_data
    const userMetadata = userData?.raw_user_meta_data || {};
    const userName = userMetadata.name || userMetadata.full_name || 'Пользователь';
    
    // Создание инициалов из имени
    const nameParts = userName.split(' ');
    const initials = nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[1][0]}`
      : userName.substring(0, 2);

    return {
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      user: {
        id: userId,
        email: userData?.email,
        name: userName,
        initials: initials.toUpperCase()
      },
      attachments: []
    };
  } catch (error) {
    console.error('Ошибка при создании сообщения:', error);
    throw error;
  }
};

/**
 * Добавление вложения к сообщению
 * @param messageId - ID сообщения
 * @param file - Файл для загрузки
 */
export const addMessageAttachment = async (
  messageId: string,
  projectId: string,
  file: File
): Promise<MessageAttachment> => {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `project-messages/${projectId}/${messageId}/${Date.now()}.${fileExt}`;
    
    // Загрузка файла в хранилище
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Ошибка при загрузке файла:', uploadError);
      throw uploadError;
    }
    
    // Получение публичной ссылки на файл
    const { data: publicUrlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);
    
    // Создание записи о вложении
    const { data, error } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_path: filePath,
        public_url: publicUrlData.publicUrl
      })
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при сохранении информации о вложении:', error);
      throw error;
    }
    
    return {
      id: data.id,
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      filePath: data.file_path,
      publicUrl: data.public_url
    };
  } catch (error) {
    console.error('Ошибка при добавлении вложения:', error);
    throw error;
  }
};

/**
 * Удаление сообщения
 * @param messageId - ID сообщения для удаления
 */
export const deleteProjectMessage = async (messageId: string): Promise<void> => {
  try {
    // Удаление вложений к сообщению из хранилища
    const { data: attachments, error: getAttError } = await supabase
      .from('message_attachments')
      .select('file_path')
      .eq('message_id', messageId);
    
    if (getAttError) {
      console.error('Ошибка при получении вложений для удаления:', getAttError);
    } else if (attachments && attachments.length > 0) {
      const filePaths = attachments.map(att => att.file_path);
      const { error: deleteStorageError } = await supabase.storage
        .from('attachments')
        .remove(filePaths);
      
      if (deleteStorageError) {
        console.error('Ошибка при удалении файлов из хранилища:', deleteStorageError);
      }
    }
    
    // Удаление записи сообщения (вложения удалятся каскадно благодаря ON DELETE CASCADE)
    const { error } = await supabase
      .from('project_messages')
      .delete()
      .eq('id', messageId);
    
    if (error) {
      console.error('Ошибка при удалении сообщения:', error);
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при удалении сообщения:', error);
    throw error;
  }
};