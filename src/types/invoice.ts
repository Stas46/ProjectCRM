// Типы данных для счетов
export interface Invoice {
  id: string;
  project_id: string;
  vendor: string;
  number: string;
  issue_date: string;
  amount: number;
  status: 'draft' | 'to_pay' | 'paid' | 'rejected';
  category: string;
  description?: string;
  file_url?: string;
  created_at: string;
  updated_at?: string;
}

// Типы для создания нового счета
export type NewInvoice = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;

// Типы для обновления счета
export type UpdateInvoice = Partial<Omit<Invoice, 'id' | 'created_at' | 'updated_at'>>;