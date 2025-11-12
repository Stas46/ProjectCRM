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
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null); // для подсветки папки при drag-over
  const [allFolders, setAllFolders] = useState<FolderStructure[]>([]);
  
  // Touch события для мобильных устройств
  const [touchStart, setTouchStart] = useState<{ fileId: string; x: number; y: number } | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<{ x: number; y: number } | null>(null);
  
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
    console.log('📦 handleDrop вызван:', { targetFolder, draggedFile, currentFolder });
    setIsDragging(false);
    
    // Если перетаскиваем внешний файл
    const file = e.dataTransfer.files?.[0];
    if (file) {
      console.log('📁 Внешний файл:', file.name, 'в папку:', targetFolder);
      setUploading(true);
      const result = await uploadFile(file, targetFolder, userId);
      setUploading(false);
      if (!result.success) {
        alert(`Ошибка: ${result.error}`);
      }
      return;
    }

    // Если перетаскиваем файл из списка
    if (draggedFile) {
      console.log('🔄 Перемещение файла из списка:', draggedFile, 'в:', targetFolder);
      setUploading(true);
      await moveFile(draggedFile, targetFolder);
      setUploading(false);
    } else {
      console.log('⚠️ draggedFile не установлен');
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
        // Принудительно обновляем список - важно для корректного отображения
        await refresh();
        // Небольшая задержка и второе обновление для надежности
        setTimeout(() => refresh(), 100);
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

  // Touch события для мобильных устройств
  const handleTouchStart = (e: React.TouchEvent, fileId: string) => {
    const touch = e.touches[0];
    console.log('👆 TouchStart:', fileId, 'at', touch.clientX, touch.clientY);
    setTouchStart({ fileId, x: touch.clientX, y: touch.clientY });
    setDraggedFile(fileId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    setTouchCurrent({ x: touch.clientX, y: touch.clientY });
    
    // Визуальный эффект перетаскивания
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.hasAttribute('data-folder-path')) {
      const folderPath = element.getAttribute('data-folder-path');
      console.log('📱 TouchMove над папкой:', folderPath);
      setDragOverFolder(folderPath);
    } else {
      setDragOverFolder(null);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (!touchStart || !draggedFile) {
      console.log('⚠️ TouchEnd без touchStart или draggedFile');
      return;
    }
    
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    console.log('👆 TouchEnd:', draggedFile, 'at', touch.clientX, touch.clientY);
    
    if (element && element.hasAttribute('data-folder-path')) {
      const targetFolder = element.getAttribute('data-folder-path');
      console.log('🎯 Touch drop в папку:', targetFolder);
      if (targetFolder && targetFolder !== currentFolder) {
        setUploading(true);
        await moveFile(draggedFile, targetFolder);
        setUploading(false);
      }
    }
    
    setTouchStart(null);
    setTouchCurrent(null);
    setDraggedFile(null);
    setDragOverFolder(null);
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
          {/* Кнопка возврата */}
          <button
            onClick={() => setSelectedFolder(null)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded w-full transition-colors"
          >
            <span>←</span>
            <span>Назад к файлам</span>
          </button>
          
          <div className="h-px bg-gray-200 my-2" />
          
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
        onDragOver={(e) => { 
          e.preventDefault(); 
          console.log('🎨 Основная область onDragOver');
          setIsDragging(true); 
        }}
        onDragLeave={(e) => { 
          e.preventDefault(); 
          console.log('👋 Основная область onDragLeave');
          setIsDragging(false); 
        }}
        onDrop={(e) => {
          console.log('📍 Основная область onDrop');
          handleDrop(e, selectedFolder || undefined);
        }}
        className={`space-y-1 min-h-[400px] ${isDragging ? 'bg-blue-50' : ''}`}
      >
        {/* Drop-зона для перемещения в корень (показывается только в подпапках при перетаскивании) */}
        {currentFolder && draggedFile && (
          <div
            onDragOver={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              console.log('🏠 Drop-зона корня onDragOver');
              setDragOverFolder('__root__');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('👋 Drop-зона корня onDragLeave');
              setDragOverFolder(null);
            }}
            onDrop={(e) => { 
              e.stopPropagation(); 
              console.log('🎯 Drop-зона корня onDrop');
              setDragOverFolder(null);
              handleDrop(e, undefined); // undefined = корень
            }}
            className={`mb-3 p-4 border-2 border-dashed rounded-lg text-center transition-all ${
              dragOverFolder === '__root__'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOverFolder === '__root__' ? 'text-blue-600' : 'text-gray-400'}`} />
            <p className={`text-sm font-medium ${dragOverFolder === '__root__' ? 'text-blue-700' : 'text-gray-600'}`}>
              {dragOverFolder === '__root__' ? 'Отпустите для перемещения в корень' : '📁 Переместить в корневую папку'}
            </p>
          </div>
        )}
        
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
                onClick={() => {
                  setSelectedFolder('__invoices__');
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 hover:text-blue-600 rounded cursor-pointer group transition-colors"
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
                data-folder-path={folder.path}
                onClick={() => {
                  console.log('📂 Клик на папку:', folder.path);
                  setSelectedFolder(folder.path);
                  setCurrentFolder(folder.path);
                }}
                onDragOver={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  console.log('📁 Папка onDragOver:', folder.path);
                  setDragOverFolder(folder.path);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('👋 Папка onDragLeave:', folder.path);
                  setDragOverFolder(null);
                }}
                onDrop={(e) => { 
                  e.stopPropagation(); 
                  console.log('🎯 Папка onDrop:', folder.path);
                  setDragOverFolder(null);
                  handleDrop(e, folder.path); 
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer group transition-colors ${
                  dragOverFolder === folder.path 
                    ? 'bg-blue-100 border-2 border-blue-400' 
                    : 'hover:bg-blue-50 hover:text-blue-600 border-2 border-transparent'
                }`}
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
                draggable={true}
                onDragStart={(e) => {
                  console.log('🎯 DragStart файл:', file.id, file.file_name);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', file.id); // Добавляем данные
                  setDraggedFile(file.id);
                }}
                onDragEnd={() => {
                  console.log('🏁 DragEnd файл:', file.id);
                  setDraggedFile(null);
                }}
                onTouchStart={(e) => handleTouchStart(e, file.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded group cursor-move"
              >
                {getFileIcon(file.file_type)}
                <a 
                  href={file.public_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  draggable={false}
                  className="text-sm flex-1 truncate hover:text-blue-600"
                  onClick={(e) => e.stopPropagation()}
                  onDragStart={(e) => e.preventDefault()}
                >
                  {file.file_name}
                </a>
                <span className="text-xs text-gray-400" draggable={false}>{formatBytes(file.file_size)}</span>
                <button
                  draggable={false}
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
        {/* Breadcrumbs - показываем всегда когда есть currentFolder или тащим файл */}
        {(currentFolder || draggedFile) && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <button 
              data-folder-path="__root__"
              onClick={() => {
                console.log('🏠 Breadcrumb: клик на Корень');
                setCurrentFolder(undefined);
                setSelectedFolder(null);
              }}
              onDragOver={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                console.log('🏠 Breadcrumb Корень: onDragOver');
                setDragOverFolder('__root__');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('👋 Breadcrumb Корень: onDragLeave');
                setDragOverFolder(null);
              }}
              onDrop={(e) => { 
                e.stopPropagation(); 
                console.log('🎯 Breadcrumb Корень: onDrop');
                setDragOverFolder(null);
                handleDrop(e, undefined); // undefined = корень
              }}
              className={`px-2 py-1 rounded transition-colors ${
                dragOverFolder === '__root__'
                  ? 'bg-blue-100 text-blue-700 font-semibold border-2 border-blue-400'
                  : !currentFolder && draggedFile
                    ? 'bg-gray-100 text-gray-700 font-medium'
                    : 'hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              📁 Корень
            </button>
            {currentFolder && currentFolder.split('/').map((part, idx, arr) => (
              <div key={idx} className="flex items-center gap-2">
                <span>/</span>
                <button 
                  data-folder-path={arr.slice(0, idx + 1).join('/')}
                  onClick={() => {
                    const newPath = arr.slice(0, idx + 1).join('/');
                    console.log('📂 Breadcrumb: клик на', newPath);
                    setCurrentFolder(newPath);
                    setSelectedFolder(newPath);
                  }}
                  onDragOver={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation();
                    const folderPath = arr.slice(0, idx + 1).join('/');
                    console.log('📁 Breadcrumb onDragOver:', folderPath);
                    setDragOverFolder(folderPath);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const folderPath = arr.slice(0, idx + 1).join('/');
                    console.log('👋 Breadcrumb onDragLeave:', folderPath);
                    setDragOverFolder(null);
                  }}
                  onDrop={(e) => { 
                    e.stopPropagation(); 
                    const folderPath = arr.slice(0, idx + 1).join('/');
                    console.log('🎯 Breadcrumb onDrop:', folderPath);
                    setDragOverFolder(null);
                    handleDrop(e, folderPath);
                  }}
                  className={`px-2 py-1 rounded transition-colors ${
                    dragOverFolder === arr.slice(0, idx + 1).join('/')
                      ? 'bg-blue-100 text-blue-700 font-semibold border-2 border-blue-400'
                      : idx === arr.length - 1 
                        ? 'font-medium' 
                        : 'hover:text-blue-600 hover:bg-blue-50'
                  }`}
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
