// Централизованная система цветов для категорий (оконный бизнес)
export const CATEGORY_COLORS = {
  // Категории на русском
  'Профили': '#3B82F6',              // blue-500
  'Стеклопакеты': '#06B6D4',         // cyan-500
  'Фурнитура': '#8B5CF6',            // purple-500
  'Комплектация': '#10B981',         // green-500
  'Подъемное оборудование': '#F59E0B', // amber-500
  'Монтаж': '#EAB308',               // yellow-500
  'Логистика': '#F97316',            // orange-500
  'Производство': '#EC4899',         // pink-500
  'Крепеж': '#78716C',               // stone-500
  'Покраска': '#A855F7',             // purple-600
  'Нащельники': '#14B8A6',           // teal-500
  'Проектирование': '#84CC16',       // lime-500
  'Кронштейны': '#6366F1',           // indigo-500
  'Прочее': '#6B7280',               // gray-500
  'Доп работы': '#EF4444',           // red-500
  'Общее': '#64748B',                // slate-500
  
  // Категории на английском (для программного использования)
  'profiles': '#3B82F6',
  'glass_units': '#06B6D4',
  'fittings': '#8B5CF6',
  'accessories': '#10B981',
  'lifting': '#F59E0B',
  'installation': '#EAB308',
  'logistics': '#F97316',
  'manufacturing': '#EC4899',
  'fasteners': '#78716C',
  'painting': '#A855F7',
  'trim_strips': '#14B8A6',
  'design': '#84CC16',
  'brackets': '#6366F1',
  'other': '#6B7280',
  'additional_work': '#EF4444',
  'general': '#64748B'
} as const;

// Цвета для фона категорий (более светлые версии)
export const CATEGORY_BG_COLORS = {
  // Категории на русском
  'Профили': '#DBEAFE',              // blue-100
  'Стеклопакеты': '#CFFAFE',         // cyan-100
  'Фурнитура': '#EDE9FE',            // purple-100
  'Комплектация': '#D1FAE5',         // green-100
  'Подъемное оборудование': '#FEF3C7', // amber-100
  'Монтаж': '#FEF9C3',               // yellow-100
  'Логистика': '#FFEDD5',            // orange-100
  'Производство': '#FCE7F3',         // pink-100
  'Крепеж': '#F5F5F4',               // stone-100
  'Покраска': '#F3E8FF',             // purple-100
  'Нащельники': '#F0FDFA',           // teal-100
  'Проектирование': '#ECFCCB',       // lime-100
  'Кронштейны': '#E0E7FF',           // indigo-100
  'Прочее': '#F3F4F6',               // gray-100
  'Доп работы': '#FEE2E2',           // red-100
  'Общее': '#F1F5F9',                // slate-100
  
  // Категории на английском
  'profiles': '#DBEAFE',
  'glass_units': '#CFFAFE',
  'fittings': '#EDE9FE',
  'accessories': '#D1FAE5',
  'lifting': '#FEF3C7',
  'installation': '#FEF9C3',
  'logistics': '#FFEDD5',
  'manufacturing': '#FCE7F3',
  'fasteners': '#F5F5F4',
  'painting': '#F3E8FF',
  'trim_strips': '#F0FDFA',
  'design': '#ECFCCB',
  'brackets': '#E0E7FF',
  'other': '#F3F4F6',
  'additional_work': '#FEE2E2',
  'general': '#F1F5F9'
} as const;

// Функция для получения цвета категории
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Прочее'];
}

// Функция для получения цвета фона категории
export function getCategoryBgColor(category: string): string {
  return CATEGORY_BG_COLORS[category as keyof typeof CATEGORY_BG_COLORS] || CATEGORY_BG_COLORS['Прочее'];
}

// Функция для получения светлого варианта цвета
export function getLightColor(color: string): string {
  // Конвертируем hex в более светлый вариант
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Делаем цвет светлее (добавляем белого)
  const lightR = Math.round(r + (255 - r) * 0.8);
  const lightG = Math.round(g + (255 - g) * 0.8);
  const lightB = Math.round(b + (255 - b) * 0.8);
  
  return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
}