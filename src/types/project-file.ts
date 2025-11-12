// ============================================
// Типы для файлов проекта
// ============================================

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  folder: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  public_url: string;
}

export interface CreateProjectFile {
  project_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  folder?: string;
  uploaded_by?: string;
  public_url: string;
}

export interface ProjectFolder {
  name: string;
  path: string;
  file_count: number;
}

export interface FileUploadResponse {
  success: boolean;
  file?: ProjectFile;
  error?: string;
}

export interface FileListResponse {
  success: boolean;
  files?: ProjectFile[];
  folders?: ProjectFolder[];
  error?: string;
}
