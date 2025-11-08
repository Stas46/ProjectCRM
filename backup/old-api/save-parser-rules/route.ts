import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  console.log('📝 [PARSER-RULES] Получен запрос на сохранение правил');
  
  try {
    const rules = await request.json();
    
    // Путь к файлу правил
    const rulesPath = path.join(process.cwd(), 'parser_rules.json');
    
    // Сохраняем правила
    await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2), 'utf-8');
    
    console.log('✅ [PARSER-RULES] Правила сохранены успешно');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Правила сохранены успешно' 
    });
    
  } catch (error: any) {
    console.error('❌ [PARSER-RULES] Ошибка:', error.message);
    return NextResponse.json({ 
      error: error.message || 'Ошибка сохранения правил' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('📖 [PARSER-RULES] Получен запрос на загрузку правил');
  
  try {
    const rulesPath = path.join(process.cwd(), 'parser_rules.json');
    
    try {
      const rulesData = await fs.readFile(rulesPath, 'utf-8');
      const rules = JSON.parse(rulesData);
      
      console.log('✅ [PARSER-RULES] Правила загружены успешно');
      
      return NextResponse.json(rules);
      
    } catch (fileError) {
      console.log('⚠️ [PARSER-RULES] Файл правил не найден, создаём стандартные');
      
      // Создаём стандартные правила
      const defaultRules = {
        invoice_number_patterns: [
          {
            pattern: "№\\s*([А-ЯЁA-Z]+-\\d+)",
            priority: 1,
            description: "Буквенно-цифровые номера (УТ-784, А-123)",
            active: true
          },
          {
            pattern: "СЧЕТ.*?№\\s*([А-ЯA-Z]+-\\d+)",
            priority: 1,
            description: "СЧЕТ с буквенно-цифровым номером",
            active: true
          }
        ],
        total_amount_patterns: [
          {
            pattern: "(?:всего\\s*к\\s*оплате|ВСЕГО\\s*К\\s*ОПЛАТЕ)[\\s:]*([0-9]{1,3}(?:[\\s,\\.][0-9]{3})*[\\.,]\\d{2})",
            priority: 1,
            description: "Всего к оплате",
            active: true
          },
          {
            pattern: "(?:Итого|ИТОГО|Total)[\\s:]*([0-9]{1,3}(?:[\\s,\\.][0-9]{3})*[\\.,]\\d{2})",
            priority: 1,
            description: "Итого с двоеточием",
            active: true
          }
        ],
        contractor_name_patterns: [
          {
            pattern: "Поставщик:\\s*([^\\n\\r,]+?)(?:,|\\s*ИНН|\\s*КПП|\\s*Адрес:|\\s*тел\\.|\\s*$)",
            priority: 1,
            description: "Поставщик: НАЗВАНИЕ",
            active: true
          }
        ],
        inn_patterns: [
          {
            pattern: "ИНН[\\s:]*(\\d{10,12})",
            priority: 2,
            description: "Любой ИНН",
            active: true
          }
        ],
        settings: {
          min_invoice_amount: 100,
          exclude_inn_from_customer: true,
          debug_mode: false
        }
      };
      
      // Сохраняем стандартные правила
      await fs.writeFile(rulesPath, JSON.stringify(defaultRules, null, 2), 'utf-8');
      
      return NextResponse.json(defaultRules);
    }
    
  } catch (error: any) {
    console.error('❌ [PARSER-RULES] Ошибка:', error.message);
    return NextResponse.json({ 
      error: error.message || 'Ошибка загрузки правил' 
    }, { status: 500 });
  }
}