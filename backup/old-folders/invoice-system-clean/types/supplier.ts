// ============================================
// TypeScript типы для таблицы suppliers
// ============================================

/**
 * Категории расходов для группировки поставщиков
 */
export type SupplierCategory = 
  | 'construction'      // Строительство
  | 'materials'         // Материалы
  | 'services'          // Услуги
  | 'equipment'         // Оборудование
  | 'transport'         // Транспорт
  | 'other';            // Прочее

/**
 * Интерфейс поставщика (точно соответствует таблице suppliers)
 */
export interface Supplier {
  id: string;
  
  // Основные данные
  name: string;
  inn: string | null;
  
  // Контакты
  phone: string | null;
  email: string | null;
  legal_address: string | null;
  
  // Категоризация
  category: SupplierCategory | null;
  
  // Временные метки
  created_at: string;
  updated_at: string | null;
}

/**
 * Данные для создания нового поставщика
 */
export interface CreateSupplier {
  name: string;
  inn?: string;
  phone?: string;
  email?: string;
  legal_address?: string;
  category?: SupplierCategory;
}

/**
 * Данные для обновления поставщика
 */
export type UpdateSupplier = Partial<Omit<CreateSupplier, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Поставщик с суммами счетов (из view supplier_totals)
 */
export interface SupplierWithTotals extends Supplier {
  invoice_count: number;
  total_amount: number;
  total_vat: number;
}
