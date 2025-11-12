'use client';

import { useState } from 'react';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  Folder, 
  File, 
  Trash2, 
  Download, 
  Image, 
  FileText, 
  FolderPlus,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface ProjectFileManagerProps {
  projectId: string;
  userId?: string;
}

export function ProjectFileManager({ projectId, userId }: ProjectFileManagerProps) {
  const [currentFolder, setCurrentFolder] = useState<string | undefined>();
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const { files, folders, loading, error, uploadFile, deleteFile, refresh } = useProjectFiles(projectId, currentFolder);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const result = await uploadFile(file, currentFolder, userId);
    setUploading(false);

    if (result.success) {
      event.target.value = ''; // Сброс input
    } else {
      alert(`Ошибка: ${result.error}`);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Удалить файл "${fileName}"?`)) return;

    const result = await deleteFile(fileId);
    if (!result.success) {
      alert(`Ошибка: ${result.error}`);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const folderPath = currentFolder 
      ? `${currentFolder}/${newFolderName}` 
      : newFolderName;

    setCurrentFolder(folderPath);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setUploading(true);
    const result = await uploadFile(file, currentFolder, userId);
    setUploading(false);

    if (!result.success) {
      alert(`Ошибка: ${result.error}`);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) 
      return <FileText className="w-8 h-8 text-blue-600" />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) 
      return <FileText className="w-8 h-8 text-green-600" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📁 Файлы проекта
        </CardTitle>
        <CardDescription>
          {currentFolder ? `Папка: ${currentFolder}` : 'Все файлы'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Панель управления */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {currentFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentFolder(undefined)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewFolder(!showNewFolder)}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Новая папка
          </Button>

          <div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label 
              htmlFor="file-upload" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Загрузить файл
            </label>
          </div>
        </div>

        {/* Создание новой папки */}
        {showNewFolder && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Название папки"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <Button size="sm" onClick={handleCreateFolder}>
              Создать
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName('');
              }}
            >
              Отмена
            </Button>
          </div>
        )}

        {/* Список папок */}
        {!currentFolder && folders.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Папки</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {folders.map((folder) => (
                <button
                  key={folder.path}
                  onClick={() => setCurrentFolder(folder.path)}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Folder className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{folder.name}</div>
                    <div className="text-xs text-gray-500">
                      {folder.file_count} файлов
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Drag & Drop зона */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 mb-4 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isDragging ? 'Отпустите файл для загрузки' : 'Перетащите файл сюда или используйте кнопку выше'}
          </p>
        </div>

        {/* Загрузка */}
        {loading && (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Загрузка...
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="text-center py-8 text-red-500">
            {error}
          </div>
        )}

        {/* Список файлов */}
        {!loading && !error && (
          <>
            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Файлов пока нет
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold mb-2">Файлы</h3>
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {getFileIcon(file.file_type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.file_name}</div>
                      <div className="text-xs text-gray-500">
                        {formatBytes(file.file_size)} · {formatDate(file.created_at)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={file.public_url}
                        download={file.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.id, file.file_name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
