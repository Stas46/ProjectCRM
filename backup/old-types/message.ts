// Типы для сообщений проекта

export interface MessageUser {
  id: string;
  email?: string;
  name: string;
  initials: string;
  avatar?: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  filePath: string;
  publicUrl?: string;
}

export interface ProjectMessage {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user: MessageUser;
  attachments?: MessageAttachment[];
}

export interface NewMessageInput {
  projectId: string;
  content: string;
  attachments?: File[];
}

export interface ProjectMessageResponse {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  project_id: string;
  users?: {
    id: string;
    email: string;
    raw_user_meta_data: any;
  };
}