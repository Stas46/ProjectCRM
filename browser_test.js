// Простой тест API с помощью fetch в браузере
async function testAPI() {
  const formData = new FormData();
  
  // Создаем тестовый файл blob
  const testContent = `СЧЕТ № 12345
от 28 сентября 2024 г.

Поставщик: ООО "Тестовая компания"
ИНН: 1234567890
КПП: 123456789

Всего к оплате: 186000.00
в том числе НДС: 31000.00
`;
  
  const blob = new Blob([testContent], { type: 'text/plain' });
  formData.append('file', blob, 'test.txt');
  formData.append('dpi', '300');
  
  try {
    const response = await fetch('/api/smart-invoice', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    console.log('API Response:', result);
    
    if (result.success && result.data) {
      console.log('✅ Успешно извлечены данные:');
      console.log('Счет:', result.data.invoice.number);
      console.log('Дата:', result.data.invoice.date);
      console.log('Сумма:', result.data.invoice.total_amount);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Для запуска в консоли браузера:
// testAPI();