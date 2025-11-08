const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function checkSuppliers() {
  console.log('🔍 Проверяю поставщиков в БД...\n');
  
  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  console.log(`✅ Найдено поставщиков: ${suppliers.length}\n`);
  
  suppliers.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name}`);
    console.log(`   ИНН: ${s.inn || 'не указан'}`);
    console.log(`   Категория: ${s.category}`);
    console.log(`   ID: ${s.id}`);
    console.log(`   Создан: ${s.created_at}`);
    console.log('');
  });
}

checkSuppliers().catch(console.error);
