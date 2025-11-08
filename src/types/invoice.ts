// ============================================
// TypeScript типы для таблицы invoices
// ============================================

/**
 * Интерфейс счета (точно соответствует таблице invoices)
 */
export interface Invoice {
  id: string;
  
  // Связи
  supplier_id: string | null;
  project_id: string | null; // Будущая привязка к проектам
  
  // Данные счета
  invoice_number: string;
  invoice_date: string; // ISO date string
  
  // Финансы
  total_amount: number;
  vat_amount: number | null;
  
  // Файл (опционально для Excel файлов)
  file_url: string | null;
  
  // Временные метки
  created_at: string;
  updated_at: string | null;
}

/**
 * Данные для создания нового счета
 */
export interface CreateInvoice {
  supplier_id?: string;
  project_id?: string; // Опциональная привязка к проекту
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  vat_amount?: number;
  file_url?: string | null; // Опционально для Excel файлов
}

/**
 * Данные для обновления счета
 */
export type UpdateInvoice = Partial<Omit<CreateInvoice, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Счет с данными поставщика (из view invoices_with_suppliers)
 */
export interface InvoiceWithSupplier extends Invoice {
  supplier_name: string | null;
  supplier_inn: string | null;
  supplier_category: string | null;
}

/**
 * Результат распознавания счета через OCR
 */
export interface ParsedInvoiceData {
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  vat_amount: number | null;
  supplier_name: string | null;
  supplier_inn: string | null;
}
