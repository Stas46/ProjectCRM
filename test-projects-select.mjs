import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProjectsSelect() {
  console.log('\n=== Тест 1: select("*") ===');
  const res1 = await supabase.from('projects').select('*');
  console.log('Error:', res1.error);
  console.log('Data length:', res1.data?.length);
  console.log('Data:', res1.data);

  console.log('\n=== Тест 2: select("id, title") ===');
  const res2 = await supabase.from('projects').select('id, title');
  console.log('Error:', res2.error);
  console.log('Data length:', res2.data?.length);
  console.log('Data:', res2.data);

  console.log('\n=== Тест 3: select("id, title, emoji") ===');
  const res3 = await supabase.from('projects').select('id, title, emoji');
  console.log('Error:', res3.error);
  console.log('Data length:', res3.data?.length);
  console.log('Data:', res3.data);
}

testProjectsSelect();
