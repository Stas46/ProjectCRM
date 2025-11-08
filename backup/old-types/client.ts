// Типы данных для клиентов

export type ClientType = 'individual' | 'company';

export interface Client {
  id: string;
  type: ClientType;
  
  // Общее поле (обязательное в БД)
  name: string;
  
  // Для физических лиц
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  
  // Для компаний
  company_name?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  
  // Контактная информация
  phone?: string;
  email?: string;
  additional_phones?: string[];
  additional_emails?: string[];
  
  // Адреса (для компаний)
  legal_address?: string;
  actual_address?: string;
  
  // Контактное лицо (для компаний)
  contact_person?: string;
  contact_person_position?: string;
  contact_person_phone?: string;
  contact_person_email?: string;
  
  // Дополнительная информация
  notes?: string;
  source?: string; // Источник привлечения
  rating?: number; // Рейтинг клиента 1-5
  
  // Документы и дополнительные данные
  documents?: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
}

// Источники привлечения клиентов
export const clientSources = [
  { value: 'website', label: 'Сайт' },
  { value: 'phone', label: 'Звонок' },
  { value: 'social', label: 'Соц. сети' },
  { value: 'recommendation', label: 'Рекомендация' },
  { value: 'advertising', label: 'Реклама' },
  { value: 'partner', label: 'Партнер' },
  { value: 'repeat', label: 'Повторное обращение' },
  { value: 'other', label: 'Другое' }
] as const;

// Функция для получения полного имени клиента
export function getClientFullName(client: Client): string {
  if (client.type === 'company') {
    return client.company_name || 'Без названия';
  }
  
  const parts = [
    client.last_name,
    client.first_name,
    client.middle_name
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(' ') : 'Без имени';
}

// Функция для получения короткого имени клиента
export function getClientShortName(client: Client): string {
  if (client.type === 'company') {
    return client.company_name || 'Без названия';
  }
  
  const parts = [
    client.last_name,
    client.first_name ? `${client.first_name[0]}.` : null,
    client.middle_name ? `${client.middle_name[0]}.` : null
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(' ') : 'Без имени';
}

// Функция для получения основного телефона
export function getClientMainPhone(client: Client): string | undefined {
  return client.phone || client.additional_phones?.[0];
}

// Функция для получения основного email
export function getClientMainEmail(client: Client): string | undefined {
  return client.email || client.additional_emails?.[0];
}

// Функция для форматирования адреса
export function getClientAddress(client: Client): string | undefined {
  if (client.type === 'company') {
    return client.actual_address || client.legal_address;
  }
  return undefined;
}

// Валидация ИНН для юридических лиц (10 цифр)
export function validateCompanyINN(inn: string): boolean {
  if (inn.length !== 10) return false;
  const digits = inn.split('').map(Number);
  const checksum = (
    2 * digits[0] +
    4 * digits[1] +
    10 * digits[2] +
    3 * digits[3] +
    5 * digits[4] +
    9 * digits[5] +
    4 * digits[6] +
    6 * digits[7] +
    8 * digits[8]
  ) % 11 % 10;
  return checksum === digits[9];
}

// Валидация ИНН для физических лиц (12 цифр)
export function validateIndividualINN(inn: string): boolean {
  if (inn.length !== 12) return false;
  const digits = inn.split('').map(Number);
  
  const checksum1 = (
    7 * digits[0] +
    2 * digits[1] +
    4 * digits[2] +
    10 * digits[3] +
    3 * digits[4] +
    5 * digits[5] +
    9 * digits[6] +
    4 * digits[7] +
    6 * digits[8] +
    8 * digits[9]
  ) % 11 % 10;
  
  const checksum2 = (
    3 * digits[0] +
    7 * digits[1] +
    2 * digits[2] +
    4 * digits[3] +
    10 * digits[4] +
    3 * digits[5] +
    5 * digits[6] +
    9 * digits[7] +
    4 * digits[8] +
    6 * digits[9] +
    8 * digits[10]
  ) % 11 % 10;
  
  return checksum1 === digits[10] && checksum2 === digits[11];
}

// Общая валидация ИНН
export function validateINN(inn: string): boolean {
  if (!inn) return true; // ИНН необязательный
  const cleaned = inn.replace(/\D/g, '');
  if (cleaned.length === 10) return validateCompanyINN(cleaned);
  if (cleaned.length === 12) return validateIndividualINN(cleaned);
  return false;
}

// Функция для получения типа клиента по ИНН
export function getClientTypeByINN(inn?: string): ClientType {
  if (!inn) return 'individual';
  const cleaned = inn.replace(/\D/g, '');
  return cleaned.length === 10 ? 'company' : 'individual';
}
