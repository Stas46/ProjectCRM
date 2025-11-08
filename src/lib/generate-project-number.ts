import { supabase } from './supabase';

/**
 * Генерирует уникальный номер проекта в формате PRJ-YYYY-NNNN
 * Например: PRJ-2024-0001, PRJ-2024-0002
 */
export async function generateProjectNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}`;
  
  try {
    // Получаем все проекты текущего года
    const { data: projects, error } = await supabase
      .from('projects')
      .select('project_number')
      .like('project_number', `${prefix}-%`)
      .order('project_number', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Ошибка получения последнего номера проекта:', error);
      // В случае ошибки возвращаем первый номер года
      return `${prefix}-0001`;
    }
    
    if (!projects || projects.length === 0) {
      // Если проектов в этом году еще нет, начинаем с 0001
      return `${prefix}-0001`;
    }
    
    // Извлекаем последний номер
    const lastNumber = projects[0].project_number;
    const match = lastNumber.match(/PRJ-\d{4}-(\d{4})/);
    
    if (!match) {
      // Если формат не соответствует, начинаем с 0001
      return `${prefix}-0001`;
    }
    
    const lastSequence = parseInt(match[1], 10);
    const nextSequence = lastSequence + 1;
    
    // Форматируем номер с ведущими нулями (0001, 0002, и т.д.)
    const paddedSequence = nextSequence.toString().padStart(4, '0');
    
    return `${prefix}-${paddedSequence}`;
    
  } catch (error) {
    console.error('Неожиданная ошибка при генерации номера проекта:', error);
    // В случае любой ошибки возвращаем базовый номер
    return `${prefix}-0001`;
  }
}

/**
 * Проверяет, существует ли проект с таким номером
 */
export async function isProjectNumberExists(projectNumber: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('project_number', projectNumber)
      .limit(1);
    
    if (error) {
      console.error('Ошибка проверки существования номера проекта:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Неожиданная ошибка при проверке номера проекта:', error);
    return false;
  }
}

/**
 * Генерирует уникальный номер проекта с проверкой на дубликаты
 */
export async function generateUniqueProjectNumber(): Promise<string> {
  let projectNumber = await generateProjectNumber();
  let attempts = 0;
  const maxAttempts = 10;
  
  // Проверяем на дубликаты (на случай параллельного создания проектов)
  while (await isProjectNumberExists(projectNumber) && attempts < maxAttempts) {
    // Если номер уже существует, генерируем следующий
    const match = projectNumber.match(/PRJ-(\d{4})-(\d{4})/);
    if (match) {
      const year = match[1];
      const sequence = parseInt(match[2], 10) + 1;
      projectNumber = `PRJ-${year}-${sequence.toString().padStart(4, '0')}`;
    }
    attempts++;
  }
  
  return projectNumber;
}
