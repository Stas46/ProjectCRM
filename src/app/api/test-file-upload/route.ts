import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Получаем FormData из запроса
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('Ошибка при получении данных формы:', formError);
      return NextResponse.json({
        error: 'Ошибка при получении данных формы',
        suggestions: ['Проверьте правильность отправки формы']
      }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        error: 'Файл не найден', 
        suggestions: ['Убедитесь, что файл был выбран перед отправкой'] 
      }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Возвращаем базовую информацию о файле для тестирования
    return NextResponse.json({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      success: true
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Ошибка при обработке файла:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      suggestions: ['Попробуйте еще раз или используйте другой файл']
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}