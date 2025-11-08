import { supabase } from '@/lib/supabase';
import { Supplier, NewSupplier, UpdateSupplier, SupplierCategory, getCategoryKeyByName } from '@/types/supplier';

// Получение всех поставщиков
export async function getAllSuppliers(): Promise<Supplier[]> {
  try {
    const response = await fetch('/api/suppliers');
    
    if (!response.ok) {
      console.error('Ошибка при получении поставщиков:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data || [];
  } catch (err) {
    console.error('Исключение при получении поставщиков:', err);
    return [];
  }
}

// Получение поставщика по ID
export async function getSupplierById(id: string): Promise<Supplier | null> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Ошибка при получении поставщика с ID ${id}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Исключение при получении поставщика с ID ${id}:`, err);
    return null;
  }
}

// Поиск поставщика по ИНН
export async function getSupplierByINN(inn: string): Promise<Supplier | null> {
  if (!inn || inn.trim() === '') {
    console.log(`[SUPPLIER-INN] Пустой ИНН: "${inn}"`);
    return null;
  }
  
  try {
    console.log(`[SUPPLIER-INN] Поиск поставщика по ИНН: "${inn.trim()}"`);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('inn', inn.trim())
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`[SUPPLIER-INN] Ошибка при поиске поставщика по ИНН ${inn}:`, error);
      return null;
    }

    if (data) {
      console.log(`[SUPPLIER-INN] ✅ Найден поставщик по ИНН ${inn}:`, data.name, '- Категория:', data.category);
    } else {
      console.log(`[SUPPLIER-INN] ❌ Поставщик с ИНН ${inn} не найден в базе`);
    }

    return data || null;
  } catch (err) {
    console.error(`[SUPPLIER-INN] Исключение при поиске поставщика по ИНН ${inn}:`, err);
    return null;
  }
}

// Поиск поставщика по имени
export async function getSupplierByName(name: string): Promise<Supplier | null> {
  try {
    console.log(`[SUPPLIER-NAME] Поиск поставщика по имени: "${name}"`);
    
    // Сначала ищем точное совпадение
    console.log(`[SUPPLIER-NAME] Поиск точного совпадения...`);
    const { data: exactMatch, error: exactError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('name', name)
      .limit(1)
      .single();

    if (exactError && exactError.code !== 'PGRST116') {
      console.error(`[SUPPLIER-NAME] Ошибка при точном поиске поставщика ${name}:`, exactError);
    }
    
    if (exactMatch) {
      console.log(`[SUPPLIER-NAME] ✅ Найдено точное совпадение для "${name}":`, exactMatch.name, '- Категория:', exactMatch.category);
      return exactMatch;
    }
    
    // Если точного совпадения нет, ищем по подстроке
    console.log(`[SUPPLIER-NAME] Точного совпадения нет, ищем по подстроке...`);
    const { data: partialMatch, error: partialError } = await supabase
      .from('suppliers')
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single();

    if (partialError && partialError.code !== 'PGRST116') {
      console.error(`[SUPPLIER-NAME] Ошибка при поиске по подстроке ${name}:`, partialError);
      return null;
    }

    if (partialMatch) {
      console.log(`[SUPPLIER-NAME] ✅ Найдено частичное совпадение для "${name}":`, partialMatch.name, '- Категория:', partialMatch.category);
    } else {
      console.log(`[SUPPLIER-NAME] ❌ Поставщик "${name}" не найден ни точно, ни по подстроке`);
    }

    return partialMatch || null;
  } catch (err) {
    console.error(`[SUPPLIER-NAME] Исключение при поиске поставщика ${name}:`, err);
    return null;
  }
}

// Получение поставщиков по категории
export async function getSuppliersByCategory(category: SupplierCategory): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error(`Ошибка при получении поставщиков категории ${category}:`, error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error(`Исключение при получении поставщиков категории ${category}:`, err);
    return [];
  }
}

// Создание нового поставщика
export async function createSupplier(supplier: NewSupplier): Promise<Supplier | null> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplier])
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании поставщика:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Исключение при создании поставщика:', err);
    return null;
  }
}

// Обновление поставщика
export async function updateSupplier(id: string, updates: UpdateSupplier): Promise<Supplier | null> {
  try {
    console.log('updateSupplier called with:', { id, updates });
    
    const response = await fetch(`/api/suppliers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ошибка при обновлении поставщика с ID ${id}:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Supplier updated successfully:', data);
    return data;
  } catch (err) {
    console.error(`Исключение при обновлении поставщика с ID ${id}:`, err);
    return null;
  }
}

// Удаление поставщика
export async function deleteSupplier(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Ошибка при удалении поставщика с ID ${id}:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Исключение при удалении поставщика с ID ${id}:`, err);
    return false;
  }
}

// Определение категории поставщика с приоритетом поиска по ИНН, затем по имени
export async function getCategoryBySupplierName(
  supplierName: string, 
  supplierInn?: string
): Promise<SupplierCategory> {
  try {
    console.log(`[SUPPLIER-CATEGORY] Определяем категорию для: "${supplierName}", ИНН: "${supplierInn}"`);
    let supplier: Supplier | null = null;

    // 1. Сначала ищем по ИНН, если он предоставлен
    if (supplierInn) {
      console.log(`[SUPPLIER-CATEGORY] Поиск по ИНН: ${supplierInn}`);
      supplier = await getSupplierByINN(supplierInn);
      if (supplier) {
        console.log(`[SUPPLIER-CATEGORY] ✅ Найден поставщик по ИНН ${supplierInn}:`, supplier.name, '- Категория:', supplier.category);
        // Конвертируем текстовое название в ключ, если категория - это текст, а не ключ
        const categoryKey = getCategoryKeyByName(supplier.category || '') || supplier.category;
        console.log(`[SUPPLIER-CATEGORY] Конвертированная категория: ${categoryKey}`);
        return categoryKey;
      } else {
        console.log(`[SUPPLIER-CATEGORY] ❌ Поставщик с ИНН ${supplierInn} не найден`);
      }
    }

    // 2. Если по ИНН не найден, ищем по имени
    console.log(`[SUPPLIER-CATEGORY] Поиск по имени: ${supplierName}`);
    supplier = await getSupplierByName(supplierName);
    if (supplier) {
      console.log(`[SUPPLIER-CATEGORY] ✅ Найден поставщик по имени ${supplierName}:`, supplier.name, '- Категория:', supplier.category);
      // Конвертируем текстовое название в ключ, если категория - это текст, а не ключ
      const categoryKey = getCategoryKeyByName(supplier.category || '') || supplier.category;
      console.log(`[SUPPLIER-CATEGORY] Конвертированная категория: ${categoryKey}`);
      return categoryKey;
    } else {
      console.log(`[SUPPLIER-CATEGORY] ❌ Поставщик "${supplierName}" не найден по имени`);
    }

    // 3. Если поставщик не найден в базе, используем алгоритмическое определение
    console.log(`[SUPPLIER-CATEGORY] Поставщик "${supplierName}" не найден в базе, используем автоопределение категории`);
    const fallbackCategory = getCategoryByKeywords(supplierName);
    console.log(`[SUPPLIER-CATEGORY] Автоопределение дало категорию:`, fallbackCategory);
    return fallbackCategory;

  } catch (error) {
    console.error('[SUPPLIER-CATEGORY] Ошибка при определении категории поставщика:', error);
    const fallbackCategory = getCategoryByKeywords(supplierName);
    console.log(`[SUPPLIER-CATEGORY] Fallback на автоопределение:`, fallbackCategory);
    return fallbackCategory;
  }
}

// Алгоритмическое определение категории по ключевым словам (fallback)
function getCategoryByKeywords(supplierName: string): SupplierCategory {
  const name = supplierName.toLowerCase();
  
  console.log(`[CATEGORY-KEYWORDS] Определяем категорию для: "${supplierName}"`);
  
  // Проверяем конкретные известные компании сначала
  const knownCompanies: Record<string, SupplierCategory> = {
    'алрус': 'profiles',
    'металлмастер': 'profiles', 
    'металлмастер-м': 'profiles',
    'озеров максим николаевич': 'logistics',
    'озеров': 'logistics',
    'эксперт рентал инжиниринг': 'lifting',
    'ал-профи': 'profiles',
    'практик': 'fittings',
    'петрович': 'fasteners',
    'компания видал': 'fittings'
  };

  // Проверяем точные совпадения или подстроки для известных компаний
  for (const [companyKey, category] of Object.entries(knownCompanies)) {
    if (name.includes(companyKey)) {
      console.log(`[CATEGORY-KEYWORDS] ✅ Найдена известная компания "${companyKey}" -> ${category}`);
      return category;
    }
  }
  
  // Ключевые слова для определения категорий
  const categoryKeywords: Record<SupplierCategory, string[]> = {
    profiles: ['профиль', 'алюминий', 'пвх', 'окна', 'рама'],
    glass_units: ['стекло', 'стеклопакет', 'остекление'],
    fittings: ['фурнитура', 'ручки', 'петли', 'замки'],
    accessories: ['комплектующие', 'запчасти', 'детали', 'аксессуары'],
    lifting: ['подъем', 'кран', 'лебедка', 'подъемник', 'рентал', 'аренда', 'инжиниринг', 'экспер'],
    installation: ['монтаж', 'установка', 'монтажник'],
    logistics: ['доставка', 'логистика', 'транспорт', 'перевозка'],
    manufacturing: ['изготовление', 'производство', 'завод'],
    fasteners: ['метиз', 'болт', 'гайка', 'шуруп', 'саморез', 'крепеж'],
    painting: ['покраска', 'краска', 'порошок', 'анодирование'],
    trim_strips: ['раскладка', 'штапик', 'уплотнитель'],
    design: ['проект', 'дизайн', 'чертеж', 'архитектор'],
    brackets: ['кронштейн', 'опора', 'консоль'],
    other: ['прочее', 'разное'],
    additional_work: ['дополнительно', 'допработы', 'сверхурочные'],
    general: []
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        console.log(`[CATEGORY-KEYWORDS] ✅ Найдено ключевое слово "${keyword}" -> ${category}`);
        return category as SupplierCategory;
      }
    }
  }

  console.log(`[CATEGORY-KEYWORDS] ❌ Категория не определена, используем 'general'`);
  return 'general'; // По умолчанию
}