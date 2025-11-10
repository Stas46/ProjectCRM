import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Новый режим: запись в файл tasks-debug.log
    if (body.content && typeof body.content === 'string') {
      const logPath = path.join(process.cwd(), 'tasks-debug.log');
      await fs.appendFile(logPath, body.content, 'utf-8');
      return NextResponse.json({ success: true });
    }
    
    const { action, ...data } = body;

    // Логируем в терминал с эмоджи для удобства
    switch (action) {
      case 'UPDATE_PROJECT':
        console.log('🔄 [UPDATE PROJECT] ID:', data.projectId);
        console.log('📝 Данные:', JSON.stringify(data.data, null, 2));
        break;
      
      case 'UPDATE_PROJECT_ERROR':
        console.log('❌ [UPDATE PROJECT ERROR]');
        console.log('🔴 Ошибка:', data.error);
        break;
      
      case 'UPDATE_PROJECT_SUCCESS':
        console.log('✅ [UPDATE PROJECT SUCCESS]');
        console.log('💾 Результат:', JSON.stringify(data.data, null, 2));
        break;
      
      case 'CREATE_TASK':
        console.log('🔄 [CREATE TASK]');
        console.log('📝 Данные:', JSON.stringify(data.data, null, 2));
        break;
      
      case 'CREATE_TASK_ERROR':
        console.log('❌ [CREATE TASK ERROR]');
        console.log('🔴 Ошибка:', data.error);
        break;
      
      case 'CREATE_TASK_SUCCESS':
        console.log('✅ [CREATE TASK SUCCESS]');
        console.log('💾 Результат:', JSON.stringify(data.data, null, 2));
        break;
      
      default:
        console.log(`📨 [${action}]`, JSON.stringify(data, null, 2));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ [LOG ERROR]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
