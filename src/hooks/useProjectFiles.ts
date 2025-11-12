// ============================================
// Hook для работы с файлами проекта
// ============================================

import { useState, useEffect } from 'react';
import type { ProjectFile, ProjectFolder } from '@/types/project-file';

export function useProjectFiles(projectId: string, folder?: string) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const url = folder 
        ? `/api/projects/${projectId}/files?folder=${encodeURIComponent(folder)}`
        : `/api/projects/${projectId}/files`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setFiles(data.files || []);
        setFolders(data.folders || []);
        setError(null);
      } else {
        setError(data.error || 'Ошибка загрузки файлов');
      }
    } catch (err) {
      setError('Ошибка загрузки файлов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, folder?: string, userId?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) formData.append('folder', folder);
      if (userId) formData.append('user_id', userId);

      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        await loadFiles(); // Обновляем список
        return { success: true, file: data.file };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
      return { success: false, error: 'Ошибка загрузки файла' };
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/files?file_id=${fileId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        await loadFiles(); // Обновляем список
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Ошибка удаления файла:', err);
      return { success: false, error: 'Ошибка удаления файла' };
    }
  };

  useEffect(() => {
    if (projectId) {
      loadFiles();
    }
  }, [projectId, folder]);

  return {
    files,
    folders,
    loading,
    error,
    uploadFile,
    deleteFile,
    refresh: loadFiles
  };
}
