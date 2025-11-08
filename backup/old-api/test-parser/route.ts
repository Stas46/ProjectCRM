import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  console.log('🧪 [TEST-PARSER] Получен запрос на тестирование парсера');
  
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Текст не предоставлен' }, { status: 400 });
    }
    
    console.log(`📝 [TEST-PARSER] Тестируем текст длиной ${text.length} символов`);
    
    // Команда для запуска Python парсера
    const command = `python python-scripts/ultimate_invoice_parser.py --text "${text.replace(/"/g, '\\"')}" --output-format json`;
    
    console.log(`🐍 [TEST-PARSER] Выполняем: ${command.substring(0, 100)}...`);
    
    const { stdout, stderr } = await execAsync(command, { 
      encoding: 'utf8',
      maxBuffer: 5 * 1024 * 1024,
      cwd: process.cwd()
    });
    
    if (stderr && stderr.trim()) {
      console.warn('⚠️ [TEST-PARSER] stderr:', stderr);
    }
    
    // Парсим JSON результат
    let parsedData;
    try {
      parsedData = JSON.parse(stdout);
    } catch (parseError) {
      console.error('❌ [TEST-PARSER] Ошибка парсинга JSON:', parseError);
      return NextResponse.json({ 
        error: 'Ошибка парсинга результата парсера',
        raw_output: stdout
      }, { status: 500 });
    }
    
    // Возвращаем результат в удобном формате
    const result = {
      invoice_number: parsedData.invoice?.number || null,
      invoice_date: parsedData.invoice?.date || null,
      total_amount: parsedData.invoice?.total_amount || null,
      contractor_name: parsedData.contractor?.name || null,
      contractor_inn: parsedData.contractor?.inn || null,
      success: true
    };
    
    console.log('✅ [TEST-PARSER] Тестирование завершено успешно');
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ [TEST-PARSER] Ошибка:', error.message);
    return NextResponse.json({ 
      error: error.message || 'Ошибка тестирования парсера',
      success: false
    }, { status: 500 });
  }
}
