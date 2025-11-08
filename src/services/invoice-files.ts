import { supabase } from '@/lib/supabase';

/**
 * Сервис для работы с файлами счетов в Supabase Storage
 */
export class InvoiceFileService {
  private bucket = 'invoice-files';
  
  /**
   * Загружает файл счета в облачное хранилище
   */
  async uploadInvoiceFile(file: File): Promise<{ url: string; path: string } | null> {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `invoice_${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      const filePath = `invoices/${fileName}`;
      
      console.log(`📤 [STORAGE] Загружаю файл в Supabase: ${filePath}`);
      
      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('❌ [STORAGE] Ошибка загрузки:', uploadError);
        return null;
      }
      
      // Получаем публичную ссылку
      const { data: publicUrlData } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(filePath);
      
      console.log(`✅ [STORAGE] Файл загружен: ${publicUrlData.publicUrl}`);
      
      return {
        url: publicUrlData.publicUrl,
        path: filePath
      };
      
    } catch (error) {
      console.error('❌ [STORAGE] Исключение при загрузке:', error);
      return null;
    }
  }
  
  /**
   * Удаляет файл из облачного хранилища
   */
  async deleteInvoiceFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([filePath]);
      
      if (error) {
        console.error('❌ [STORAGE] Ошибка удаления:', error);
        return false;
      }
      
      console.log(`🗑️ [STORAGE] Файл удален: ${filePath}`);
      return true;
      
    } catch (error) {
      console.error('❌ [STORAGE] Исключение при удалении:', error);
      return false;
    }
  }
  
  /**
   * Получает подписанную ссылку для приватного доступа к файлу
   */
  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .createSignedUrl(filePath, expiresIn);
      
      if (error) {
        console.error('❌ [STORAGE] Ошибка создания подписанной ссылки:', error);
        return null;
      }
      
      return data.signedUrl;
      
    } catch (error) {
      console.error('❌ [STORAGE] Исключение при создании подписанной ссылки:', error);
      return null;
    }
  }
  
  /**
   * Скачивает файл из облачного хранилища
   */
  async downloadFile(filePath: string): Promise<Blob | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .download(filePath);
      
      if (error) {
        console.error('❌ [STORAGE] Ошибка скачивания:', error);
        return null;
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ [STORAGE] Исключение при скачивании:', error);
      return null;
    }
  }
}

export const invoiceFileService = new InvoiceFileService();