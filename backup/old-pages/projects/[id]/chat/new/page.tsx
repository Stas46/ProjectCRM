'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Upload, Paperclip } from 'lucide-react';
import AppLayout from '@/components/app-layout';
import { supabase } from '@/lib/supabase';

export default function NewMessagePage() {
  const { id: projectId } = useParams() as { id: string };
  const router = useRouter();
  
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...fileArray]);
    }
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && attachments.length === 0) {
      setError('Пожалуйста, введите сообщение или прикрепите файл');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Получение информации о текущем пользователе
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Пользователь не авторизован');
        return;
      }
      
      // Создание записи сообщения
      const { data: messageData, error: messageError } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          user_id: user.id,
          content: message.trim() || null,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (messageError) {
        console.error('Ошибка при создании сообщения:', messageError);
        setError(`Не удалось отправить сообщение: ${messageError.message}`);
        return;
      }
      
      const messageId = messageData?.[0]?.id;
      
      // Загрузка вложений, если они есть
      if (attachments.length > 0 && messageId) {
        const uploadPromises = attachments.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const filePath = `project-messages/${projectId}/${messageId}/${Date.now()}.${fileExt}`;
          
          // Загрузка файла в хранилище
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);
          
          if (uploadError) {
            console.error('Ошибка при загрузке файла:', uploadError);
            return null;
          }
          
          // Получение публичной ссылки на файл
          const { data: publicUrlData } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);
          
          // Создание записи о вложении
          const { error: attachmentError } = await supabase
            .from('message_attachments')
            .insert({
              message_id: messageId,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_path: filePath,
              public_url: publicUrlData.publicUrl
            });
          
          if (attachmentError) {
            console.error('Ошибка при сохранении информации о вложении:', attachmentError);
            return null;
          }
          
          return true;
        });
        
        await Promise.all(uploadPromises);
      }
      
      // Перенаправление обратно на страницу проекта
      router.push(`/projects/${projectId}?tab=chat`);
      
    } catch (err: any) {
      console.error('Ошибка при отправке сообщения:', err);
      setError(`Произошла ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href={`/projects/${projectId}?tab=chat`} className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Новое сообщение</h1>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="mb-4">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Сообщение
            </label>
            <textarea
              id="message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Введите текст сообщения..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Вложения
            </label>
            
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload
                  size={32}
                  className="mx-auto h-12 w-12 text-gray-400"
                  aria-hidden="true"
                />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Загрузить файлы</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={handleAttachmentChange}
                    />
                  </label>
                  <p className="pl-1">или перетащите их сюда</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, PDF до 10MB
                </p>
              </div>
            </div>
            
            {attachments.length > 0 && (
              <ul className="mt-3 divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {attachments.map((file, index) => (
                  <li key={index} className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center">
                      <Paperclip size={16} className="text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{file.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {file.size < 1024 * 1024
                          ? `${Math.round(file.size / 1024)} KB`
                          : `${Math.round(file.size / (1024 * 1024) * 10) / 10} MB`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Link
            href={`/projects/${projectId}?tab=chat`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Отмена
          </Link>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:ring-4 focus:ring-blue-300 ${
              isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Отправка...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Отправить
              </>
            )}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </form>
    </AppLayout>
  );
}