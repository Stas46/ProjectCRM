import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  console.log('🧠 [RETRAIN-MODEL] Запуск переобучения модели парсера');
  
  try {
    // Проверяем наличие обучающих данных
    const trainingPath = path.join(process.cwd(), 'training_data.json');
    
    try {
      const trainingContent = await fs.readFile(trainingPath, 'utf-8');
      const trainingData = JSON.parse(trainingContent);
      
      if (trainingData.length < 5) {
        return NextResponse.json({ 
          error: 'Недостаточно обучающих данных. Необходимо минимум 5 записей.' 
        }, { status: 400 });
      }
      
      console.log(`📊 [RETRAIN-MODEL] Найдено ${trainingData.length} обучающих записей`);
      
      // Запускаем скрипт переобучения
      const retrainScript = path.join(process.cwd(), 'python-scripts', 'retrain_parser.py');
      
      // Создаём скрипт переобучения если его нет
      await ensureRetrainScript(retrainScript);
      
      const command = `python "${retrainScript}" --training-data "${trainingPath}"`;
      
      console.log(`🐍 [RETRAIN-MODEL] Выполняем: ${command}`);
      
      // Запускаем в фоновом режиме
      execAsync(command, { cwd: process.cwd() })
        .then(({ stdout, stderr }) => {
          console.log('✅ [RETRAIN-MODEL] Переобучение завершено успешно');
          console.log('📤 stdout:', stdout);
          if (stderr) console.warn('⚠️ stderr:', stderr);
        })
        .catch(error => {
          console.error('❌ [RETRAIN-MODEL] Ошибка переобучения:', error);
        });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Переобучение запущено в фоновом режиме',
        training_records: trainingData.length
      });
      
    } catch (fileError) {
      return NextResponse.json({ 
        error: 'Файл с обучающими данными не найден' 
      }, { status: 404 });
    }
    
  } catch (error: any) {
    console.error('❌ [RETRAIN-MODEL] Ошибка:', error.message);
    return NextResponse.json({ 
      error: error.message || 'Ошибка запуска переобучения' 
    }, { status: 500 });
  }
}

async function ensureRetrainScript(scriptPath: string) {
  try {
    await fs.access(scriptPath);
    console.log('📄 [RETRAIN-MODEL] Скрипт переобучения найден');
  } catch {
    console.log('📝 [RETRAIN-MODEL] Создаём скрипт переобучения');
    
    const scriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт переобучения парсера на основе накопленных данных
"""

import json
import argparse
import sys
from collections import Counter
import re

def main():
    parser = argparse.ArgumentParser(description='Переобучение парсера счетов')
    parser.add_argument('--training-data', required=True, help='Путь к файлу с обучающими данными')
    args = parser.parse_args()
    
    print("🧠 Начинаем переобучение парсера...")
    
    # Загружаем обучающие данные
    with open(args.training_data, 'r', encoding='utf-8') as f:
        training_data = json.load(f)
    
    print(f"📊 Загружено {len(training_data)} обучающих записей")
    
    # Анализируем паттерны
    new_patterns = analyze_patterns(training_data)
    
    # Сохраняем улучшенные правила
    save_improved_rules(new_patterns)
    
    print("✅ Переобучение завершено успешно!")

def analyze_patterns(training_data):
    print("🔍 Анализируем паттерны...")
    
    patterns = {
        'invoice_number': [],
        'total_amount': [],
        'contractor_name': [],
        'inn': []
    }
    
    for record in training_data:
        source_text = record.get('source_text', '')
        correct_data = record.get('correct_data', {})
        
        # Анализируем номера счетов
        if correct_data.get('invoice_number'):
            number = correct_data['invoice_number']
            context = extract_context(source_text, number)
            if context:
                pattern = generate_number_pattern(context)
                if pattern:
                    patterns['invoice_number'].append(pattern)
        
        # Анализируем суммы
        if correct_data.get('total_amount'):
            amount = str(correct_data['total_amount'])
            context = extract_context(source_text, amount)
            if context:
                pattern = generate_amount_pattern(context)
                if pattern:
                    patterns['total_amount'].append(pattern)
    
    return patterns

def extract_context(text, value, context_length=30):
    if value not in text:
        return None
    
    index = text.find(value)
    start = max(0, index - context_length)
    end = min(len(text), index + len(value) + context_length)
    
    return {
        'before': text[start:index],
        'value': value,
        'after': text[index + len(value):end]
    }

def generate_number_pattern(context):
    before = re.escape(context['before'].strip()[-10:])  # Последние 10 символов
    return f"{before}\\\\s*([А-Я\\\\d\\\\-]+)"

def generate_amount_pattern(context):
    before = re.escape(context['before'].strip()[-15:])  # Последние 15 символов
    return f"{before}\\\\s*([0-9]{{1,3}}(?:[\\\\s,\\\\.][0-9]{{3}})*[\\\\.,]\\\\d{{2}})"

def save_improved_rules(new_patterns):
    print("💾 Сохраняем улучшенные правила...")
    
    # Загружаем существующие правила
    try:
        with open('parser_rules.json', 'r', encoding='utf-8') as f:
            rules = json.load(f)
    except:
        rules = {'invoice_number_patterns': [], 'total_amount_patterns': []}
    
    # Добавляем новые паттерны
    for pattern_type, pattern_list in new_patterns.items():
        key = f"{pattern_type}_patterns"
        if key not in rules:
            rules[key] = []
        
        # Добавляем уникальные паттерны
        existing = {p.get('pattern') for p in rules[key]}
        for pattern in pattern_list:
            if pattern not in existing:
                rules[key].append({
                    'pattern': pattern,
                    'priority': 1,
                    'description': f'Авто-генерированный паттерн ({pattern_type})',
                    'active': True
                })
    
    # Сохраняем обновлённые правила
    with open('parser_rules_improved.json', 'w', encoding='utf-8') as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)
    
    print("✅ Правила сохранены в parser_rules_improved.json")

if __name__ == '__main__':
    main()
`;
    
    await fs.writeFile(scriptPath, scriptContent, 'utf-8');
    console.log('✅ [RETRAIN-MODEL] Скрипт переобучения создан');
  }
}