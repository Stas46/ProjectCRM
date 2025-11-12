import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Объединяет классы с помощью clsx и tailwind-merge
 * @param inputs Классы для объединения
 * @returns Строка с объединенными классами
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Форматирует сумму в рубли
 * @param amount Сумма для форматирования
 * @returns Отформатированная строка (например, "12 500 ₽")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Форматирует дату в формат "11 мая 2024"
 * @param date Дата для форматирования
 * @returns Отформатированная строка
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Сокращает текст до указанной длины и добавляет многоточие
 * @param text Текст для сокращения
 * @param maxLength Максимальная длина
 * @returns Сокращенный текст
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Форматирует размер файла в читаемый вид
 * @param bytes Размер в байтах
 * @returns Отформатированная строка (например, "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Преобразует размер файла в читаемый формат
 * @param bytes Размер в байтах
 * @returns Строка с размером (например, "1.5 МБ")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Байт';

  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Создает инициалы из имени
 * @param name Полное имя
 * @returns Инициалы (например, "ИИ" для "Иван Иванов")
 */
export function getInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * Получает случайный цвет для аватара
 * @param name Имя пользователя
 * @returns Строка с цветом
 */
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-green-500', 'bg-blue-500', 
    'bg-yellow-500', 'bg-indigo-500', 'bg-purple-500',
    'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
  ];
  
  // Используем имя в качестве основы для выбора цвета
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}