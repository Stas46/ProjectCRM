import { supabase } from '@/lib/supabase';

/**
 * Сервис для работы с файлами в Supabase Storage
 */
export const filesService = {
  /**
   * Загрузить файл в хранилище
   * @param file - Файл для загрузки
   * @param bucket - Название бакета (по умолчанию 'attachments')
   * @param folder - Папка внутри бакета
   * @returns Информацию о загруженном файле или ошибку
   */
  async uploadFile(file: File, bucket = 'attachments', folder = 'tasks') {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const filePath = `${folder}/${fileName}.${fileExt}`;
      
      // Загрузка файла в хранилище
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Ошибка при загрузке файла:', uploadError);
        return { error: uploadError };
      }
      
      // Получение публичной ссылки на файл
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      return {
        data: {
          id: fileName,
          name: file.name,
          type: file.type,
          size: file.size,
          path: filePath,
          url: publicUrlData.publicUrl,
          uploadDate: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      return { error };
    }
  },
  
  /**
   * Удалить файл из хранилища
   * @param filePath - Путь к файлу в хранилище
   * @param bucket - Название бакета (по умолчанию 'attachments')
   * @returns Статус удаления
   */
  async deleteFile(filePath: string, bucket = 'attachments') {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);
      
      if (error) {
        console.error('Ошибка при удалении файла:', error);
        return { error };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка при удалении файла:', error);
      return { error };
    }
  },
  
  /**
   * Получить список файлов из папки
   * @param folder - Папка внутри бакета
   * @param bucket - Название бакета (по умолчанию 'attachments')
   * @returns Список файлов
   */
  async listFiles(folder: string, bucket = 'attachments') {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder);
      
      if (error) {
        console.error('Ошибка при получении списка файлов:', error);
        return { error };
      }
      
      return { data };
    } catch (error) {
      console.error('Ошибка при получении списка файлов:', error);
      return { error };
    }
  }
};