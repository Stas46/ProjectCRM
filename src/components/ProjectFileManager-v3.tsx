'use client';

import { useState, useEffect } from 'react';
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
  Receipt
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

interface FolderStructure {
  name: string;
  path: string;
  isVirtual?: boolean;
  icon?: React.ReactNode;
}

export function ProjectFileManager({ projectId, userId, invoices = [] }: ProjectFileManagerProps) {
  const [currentFolder, setCurrentFolder] = useState<string | undefined>();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [allFolders, setAllFolders] = useState<FolderStructure[]>([]);
  
  const { files, folders, loading, error, uploadFile, deleteFile, refresh } = useProjectFiles(projectId, currentFolder);

  // Формируем полную структуру папок с виртуальной папкой "Счета"
  useEffect(() => {
    const structure: FolderStructure[] = [
      {
        name: `Счета (${invoices.length})`,
        path: '__invoices__',
        isVirtual: true,
        icon: <Receipt className="w-4 h-4 text-blue-500" />
      }
    ];

    // Добавляем реальные папки из базы
    folders.forEach(folder => {
      structure.push({
        name: `${folder.name} (${folder.file_count})`,
        path: folder.path,
        isVirtual: false,
        icon: <Folder className="w-4 h-4 text-yellow-500" />
      });
    });

    setAllFolders(structure);
  }, [folders, invoices.length]);

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

  const handleDrop = async (e: React.DragEvent, targetFolder?: string) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Если перетаскиваем внешний файл
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploading(true);
      const result = await uploadFile(file, targetFolder, userId);
      setUploading(false);
      if (!result.success) {
        alert(`Ошибка: ${result.error}`);
      }
      return;
    }

    // Если перетаскиваем файл между папками
    if (draggedFile && targetFolder !== currentFolder) {
      setUploading(true);
      await moveFile(draggedFile, targetFolder);
      setUploading(false);
    }
    setDraggedFile(null);
  };

  const moveFile = async (fileId: string, targetFolder?: string) => {
    try {
      console.log('🔄 Перемещение файла:', fileId, 'в папку:', targetFolder);
      
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file_id: fileId,
          target_folder: targetFolder 
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Файл перемещен');
        refresh(); // Обновляем список файлов
      } else {
        console.error('❌ Ошибка перемещения:', data.error);
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Ошибка перемещения файла:', error);
      alert('Ошибка перемещения файла');
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Удалить файл "${fileName}"?`)) return;
    const result = await deleteFile(fileId);
    if (!result.success) {
      alert(`Ошибка: ${result.error}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    // Создаем папку через API
    const response = await fetch(`/api/projects/${projectId}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        folder_name: newFolderName,
        parent_folder: currentFolder 
      })
    });

    if (response.ok) {
      setNewFolderName('');
      setShowNewFolder(false);
      refresh();
    } else {
      alert('Ошибка создания папки');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) 
      return <FileText className="w-4 h-4 text-blue-600" />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) 
      return <FileText className="w-4 h-4 text-green-600" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const renderContent = () => {
    // Показываем счета если выбрана виртуальная папка
    if (selectedFolder === '__invoices__') {
      return (
        <div className="space-y-1">
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Счетов пока нет</p>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer group"
                onClick={() => invoice.file_url && window.open(invoice.file_url, '_blank')}
              >
                <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
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
                  <Download className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                )}
              </div>
            ))
          )}
        </div>
      );
    }

    // Показываем папки и файлы вместе (как в проводнике Windows)
    const hasContent = folders.length > 0 || files.length > 0 || invoices.length > 0;
    
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => handleDrop(e, selectedFolder || undefined)}
        className={`space-y-1 min-h-[400px] ${isDragging ? 'bg-blue-50' : ''}`}
      >
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="w-12 h-12 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Перетащите файлы сюда</p>
            <p className="text-xs text-gray-400 mt-1">или используйте кнопку загрузки</p>
          </div>
        ) : (
          <>
            {/* Виртуальная папка Счета (только на верхнем уровне) */}
            {!currentFolder && invoices.length > 0 && (
              <div
                onClick={() => setSelectedFolder('__invoices__')}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer group"
              >
                <Receipt className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium flex-1">Счета</span>
                <span className="text-xs text-gray-400">{invoices.length}</span>
              </div>
            )}

            {/* Папки сверху */}
            {folders.map((folder) => (
              <div
                key={folder.path}
                onDoubleClick={() => {
                  setSelectedFolder(folder.path);
                  setCurrentFolder(folder.path);
                }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.stopPropagation(); handleDrop(e, folder.path); }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer group"
              >
                <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{folder.name}</span>
                <span className="text-xs text-gray-400">{folder.file_count}</span>
              </div>
            ))}
            
            {/* Файлы снизу */}
            {files.map((file) => (
              <div
              key={file.id}
              draggable
              onDragStart={() => setDraggedFile(file.id)}
              onDragEnd={() => setDraggedFile(null)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded group cursor-move"
            >
              {getFileIcon(file.file_type)}
              <a 
                href={file.public_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm flex-1 truncate hover:text-blue-600"
                onClick={(e) => e.stopPropagation()}
              >
                {file.file_name}
              </a>
              <span className="text-xs text-gray-400">{formatBytes(file.file_size)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(file.id, file.file_name);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-2 bg-gray-50">
        <h3 className="text-sm font-semibold flex-1">Файлы проекта</h3>
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
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="flex gap-2">
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
        </div>
      )}

      {/* Single Panel Layout - как в проводнике */}
      <div className="p-4">
        {/* Breadcrumbs */}
        {currentFolder && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <button 
              onClick={() => {
                setCurrentFolder(undefined);
                setSelectedFolder(null);
              }}
              className="hover:text-blue-600"
            >
              Все файлы
            </button>
            {currentFolder.split('/').map((part, idx, arr) => (
              <div key={idx} className="flex items-center gap-2">
                <span>/</span>
                <button 
                  onClick={() => {
                    const newPath = arr.slice(0, idx + 1).join('/');
                    setCurrentFolder(newPath);
                    setSelectedFolder(newPath);
                  }}
                  className={idx === arr.length - 1 ? 'font-medium' : 'hover:text-blue-600'}
                >
                  {part}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
