'use client';

import { useState } from 'react';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { Button } from '@/components/ui/button';
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
  Loader2,
  Plus,
  ChevronRight
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface ProjectFileManagerProps {
  projectId: string;
  userId?: string;
  invoices?: Array<{
    id: string;
    invoice_number: string;
    invoice_date: string;
    total_amount: number | null;
    file_url?: string | null;
    suppliers?: {
      name: string;
    };
  }>;
}

export function ProjectFileManager({ projectId, userId, invoices = [] }: ProjectFileManagerProps) {
  const [currentFolder, setCurrentFolder] = useState<string | undefined>();
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedView, setSelectedView] = useState<'files' | 'invoices'>('invoices');
  
  const { files, folders, loading, error, uploadFile, deleteFile, refresh } = useProjectFiles(projectId, currentFolder);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    const result = await uploadFile(file, currentFolder, userId);
    setUploading(false);

    if (!result.success) {
      alert(`Ошибка: ${result.error}`);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      event.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
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

  const getFileIcon = (fileType: string, size = 16) => {
    const className = `w-${size} h-${size}`;
    if (fileType.startsWith('image/')) return <Image className={`${className} text-blue-500`} />;
    if (fileType.includes('pdf')) return <FileText className={`${className} text-red-500`} />;
    if (fileType.includes('word') || fileType.includes('document')) 
      return <FileText className={`${className} text-blue-600`} />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) 
      return <FileText className={`${className} text-green-600`} />;
    return <File className={`${className} text-gray-500`} />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <div className="border rounded-lg bg-white">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setSelectedView('invoices')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedView === 'invoices' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Счета ({invoices.length})
        </button>
        <button
          onClick={() => setSelectedView('files')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedView === 'files' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Файлы ({files.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {selectedView === 'invoices' ? (
          /* Список счетов */
          <div className="space-y-1">
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">Счетов пока нет</p>
            ) : (
              invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer group"
                  onClick={() => invoice.file_url && window.open(invoice.file_url, '_blank')}
                >
                  <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      Счет {invoice.invoice_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {invoice.suppliers?.name} • {formatDate(invoice.invoice_date)}
                      {invoice.total_amount && ` • ${invoice.total_amount.toLocaleString('ru-RU')} ₽`}
                    </div>
                  </div>
                  {invoice.file_url && (
                    <Download className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Файловый менеджер */
          <div>
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-3">
              {currentFolder && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <button onClick={() => setCurrentFolder(undefined)} className="hover:text-blue-600">
                    Корень
                  </button>
                  <ChevronRight className="w-4 h-4" />
                  <span className="font-medium">{currentFolder.split('/').pop()}</span>
                </div>
              )}
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewFolder(!showNewFolder)}
              >
                <FolderPlus className="w-4 h-4 mr-1" />
                Папка
              </Button>
              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <label 
                  htmlFor="file-upload" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 py-2 cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  Загрузить
                </label>
              </div>
            </div>

            {/* New Folder Input */}
            {showNewFolder && (
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Название папки"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  autoFocus
                  className="h-8 text-sm"
                />
                <Button size="sm" onClick={handleCreateFolder} className="h-8">
                  Создать
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setShowNewFolder(false);
                    setNewFolderName('');
                  }}
                  className="h-8"
                >
                  Отмена
                </Button>
              </div>
            )}

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-6 mb-3 text-center transition-all
                ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}
                ${uploading ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              <Upload className="w-8 h-8 mx-auto mb-1 text-gray-400" />
              <p className="text-xs text-gray-500">
                {isDragging ? 'Отпустите файл' : 'Перетащите файл сюда'}
              </p>
            </div>

            {/* Files List - Compact Column View */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {/* Folders */}
              {!currentFolder && folders.map((folder) => (
                <div
                  key={folder.path}
                  onClick={() => setCurrentFolder(folder.path)}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded cursor-pointer group"
                >
                  <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">{folder.name}</span>
                  <span className="text-xs text-gray-400">{folder.file_count}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100" />
                </div>
              ))}

              {/* Files */}
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded group"
                >
                  {getFileIcon(file.file_type, 4)}
                  <a 
                    href={file.public_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm flex-1 truncate hover:text-blue-600"
                  >
                    {file.file_name}
                  </a>
                  <span className="text-xs text-gray-400">{formatBytes(file.file_size)}</span>
                  <button
                    onClick={() => handleDelete(file.id, file.file_name)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}

              {files.length === 0 && folders.length === 0 && !loading && (
                <p className="text-sm text-gray-500 py-8 text-center">Файлов пока нет</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
