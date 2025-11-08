// ============================================
// TypeScript типы для таблицы suppliers
// ============================================

/**
 * Категории расходов для группировки поставщиков (оконный бизнес)
 */
export type SupplierCategory = 
  | 'profiles'           // Профили
  | 'glass_units'        // Стеклопакеты
  | 'fittings'           // Фурнитура
  | 'accessories'        // Комплектация
  | 'lifting'            // Подъемное оборудование
  | 'installation'       // Монтаж
  | 'logistics'          // Логистика
  | 'manufacturing'      // Производство
  | 'fasteners'          // Крепеж
  | 'painting'           // Покраска
  | 'trim_strips'        // Нащельники
  | 'design'             // Проектирование
  | 'brackets'           // Кронштейны
  | 'other'              // Прочее
  | 'additional_work'    // Доп работы
  | 'general';           // Общее

// Алиас для обратной совместимости
export type ExpenseCategory = SupplierCategory;

/**
 * Карта категорий расходов
 */
export const expenseCategoryMap: Record<SupplierCategory, string> = {
  profiles: 'Профили',
  glass_units: 'Стеклопакеты',
  fittings: 'Фурнитура',
  accessories: 'Комплектация',
  lifting: 'Подъемное оборудование',
  installation: 'Монтаж',
  logistics: 'Логистика',
  manufacturing: 'Производство',
  fasteners: 'Крепеж',
  painting: 'Покраска',
  trim_strips: 'Нащельники',
  design: 'Проектирование',
  brackets: 'Кронштейны',
  other: 'Прочее',
  additional_work: 'Доп работы',
  general: 'Общее'
};

/**
 * Получить ключ категории по названию
 */
export function getCategoryKeyByName(name: string): SupplierCategory {
  const entry = Object.entries(expenseCategoryMap).find(([_, value]) => value === name);
  return (entry?.[0] as SupplierCategory) || 'general';
}

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

// Алиас для обратной совместимости
export type NewSupplier = CreateSupplier;

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
