import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  console.log('💾 [TRAINING-DATA] Получен запрос на сохранение обучающих данных');
  
  try {
    const trainingData = await request.json();
    
    // Проверяем обязательные поля
    if (!trainingData.source_text || !trainingData.correct_data) {
      return NextResponse.json({ error: 'Недостаточно данных для сохранения' }, { status: 400 });
    }
    
    // Создаём объект для сохранения
    const trainingRecord = {
      timestamp: new Date().toISOString(),
      file_name: trainingData.file_name || 'manual_input',
      source_text: trainingData.source_text,
      correct_data: {
        invoice_number: trainingData.correct_data.invoice_number || null,
        invoice_date: trainingData.correct_data.invoice_date || null,
        total_amount: trainingData.correct_data.total_amount || null,
        contractor_name: trainingData.correct_data.contractor_name || null,
        contractor_inn: trainingData.correct_data.contractor_inn || null
      },
      auto_detected: trainingData.auto_detected || null,
      quality_score: calculateQualityScore(trainingData.correct_data, trainingData.auto_detected)
    };
    
    // Путь к файлу с обучающими данными
    const trainingPath = path.join(process.cwd(), 'training_data.json');
    
    // Загружаем существующие данные или создаём новый массив
    let existingData = [];
    try {
      const existingContent = await fs.readFile(trainingPath, 'utf-8');
      existingData = JSON.parse(existingContent);
    } catch (error) {
      console.log('📁 [TRAINING-DATA] Создаём новый файл обучающих данных');
    }
    
    // Добавляем новую запись
    existingData.push(trainingRecord);
    
    // Сохраняем обновлённые данные
    await fs.writeFile(trainingPath, JSON.stringify(existingData, null, 2), 'utf-8');
    
    console.log(`✅ [TRAINING-DATA] Сохранена запись #${existingData.length} для файла: ${trainingRecord.file_name}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Обучающие данные сохранены',
      record_id: existingData.length,
      quality_score: trainingRecord.quality_score
    });
    
  } catch (error: any) {
    console.error('❌ [TRAINING-DATA] Ошибка:', error.message);
    return NextResponse.json({ 
      error: error.message || 'Ошибка сохранения обучающих данных' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('📖 [TRAINING-DATA] Получен запрос на загрузку обучающих данных');
  
  try {
    const trainingPath = path.join(process.cwd(), 'training_data.json');
    
    try {
      const trainingContent = await fs.readFile(trainingPath, 'utf-8');
      const trainingData = JSON.parse(trainingContent);
      
      // Возвращаем статистику
      const stats = {
        total_records: trainingData.length,
        records_by_quality: calculateQualityStats(trainingData),
        recent_records: trainingData.slice(-10).reverse(), // Последние 10 записей
        file_types: getFileTypeStats(trainingData)
      };
      
      console.log(`✅ [TRAINING-DATA] Загружено ${trainingData.length} записей`);
      
      return NextResponse.json(stats);
      
    } catch (fileError) {
      console.log('📁 [TRAINING-DATA] Файл обучающих данных не найден');
      
      return NextResponse.json({
        total_records: 0,
        records_by_quality: { excellent: 0, good: 0, poor: 0 },
        recent_records: [],
        file_types: {}
      });
    }
    
  } catch (error: any) {
    console.error('❌ [TRAINING-DATA] Ошибка:', error.message);
    return NextResponse.json({ 
      error: error.message || 'Ошибка загрузки обучающих данных' 
    }, { status: 500 });
  }
}

function calculateQualityScore(correctData: any, autoDetected: any): number {
  if (!autoDetected || !autoDetected.invoice || !autoDetected.contractor) {
    return 0;
  }
  
  let matches = 0;
  let total = 0;
  
  // Проверяем совпадения
  if (correctData.invoice_number) {
    total++;
    if (autoDetected.invoice.number === correctData.invoice_number) matches++;
  }
  
  if (correctData.invoice_date) {
    total++;
    if (autoDetected.invoice.date === correctData.invoice_date) matches++;
  }
  
  if (correctData.total_amount) {
    total++;
    if (Math.abs((autoDetected.invoice.total_amount || 0) - correctData.total_amount) < 0.01) matches++;
  }
  
  if (correctData.contractor_name) {
    total++;
    if (autoDetected.contractor.name === correctData.contractor_name) matches++;
  }
  
  if (correctData.contractor_inn) {
    total++;
    if (autoDetected.contractor.inn === correctData.contractor_inn) matches++;
  }
  
  return total > 0 ? Math.round((matches / total) * 100) : 0;
}

function calculateQualityStats(trainingData: any[]): any {
  const stats = { excellent: 0, good: 0, poor: 0 };
  
  trainingData.forEach(record => {
    const score = record.quality_score || 0;
    if (score >= 80) stats.excellent++;
    else if (score >= 50) stats.good++;
    else stats.poor++;
  });
  
  return stats;
}

function getFileTypeStats(trainingData: any[]): any {
  const stats: { [key: string]: number } = {};
  
  trainingData.forEach(record => {
    const fileName = record.file_name || 'unknown';
    const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown';
    stats[extension] = (stats[extension] || 0) + 1;
  });
  
  return stats;
}