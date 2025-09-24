/**
 * Функции для обработки файлов и преобразования между различными форматами
 */

/**
 * Преобразует ArrayBuffer в Buffer
 * Это необходимо для клиентских компонентов, так как нативный Buffer не доступен в браузере
 */
export function arrayBufferToBuffer(arrayBuffer: ArrayBuffer): Buffer {
  return Buffer.from(arrayBuffer);
}

/**
 * Преобразует File в Buffer
 * Асинхронная функция, которая сначала читает File как ArrayBuffer, а затем преобразует его в Buffer
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Извлекает расширение файла из имени файла
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

/**
 * Проверяет, является ли файл изображением на основе его MIME-типа
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Проверяет, является ли файл PDF на основе его MIME-типа
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Форматирует размер файла в человекочитаемом формате
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  return mb.toFixed(1) + ' MB';
}