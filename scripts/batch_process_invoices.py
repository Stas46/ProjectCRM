#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Пакетная обработка счетов с обработкой ошибок и повторными попытками
"""

import requests
import json
import time
from pathlib import Path
import pandas as pd
from datetime import datetime

API_URL = "http://localhost:3000/api/smart-invoice"
MAX_RETRIES = 2
RETRY_DELAY = 5

def process_with_retry(file_path, max_retries=MAX_RETRIES):
    """Обрабатывает файл с повторными попытками при ошибках"""
    filename = file_path.name
    
    # Пропускаем JPEG
    if file_path.suffix.lower() in ['.jpeg', '.jpg']:
        return {'Файл': filename, 'Статус': 'Пропущен (JPEG)'}
    
    for attempt in range(max_retries):
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (filename, f, 'application/octet-stream')}
                
                response = requests.post(API_URL, files=files, timeout=180)
                
                if response.status_code == 200:
                    result = response.json()
                    invoice = result.get('invoice', {})
                    contractor = result.get('contractor', {})
                    
                    return {
                        'Файл': filename,
                        'Номер счета (API)': invoice.get('number'),
                        'Дата (API)': invoice.get('date'),
                        'Контрагент (API)': contractor.get('name'),
                        'Сумма (API)': invoice.get('total_amount'),
                        'НДС (API)': invoice.get('vat_amount'),
                        'ИНН (API)': contractor.get('inn'),
                        'Статус': 'Успешно'
                    }
                elif response.status_code == 500:
                    error_msg = response.text[:200]
                    if attempt < max_retries - 1:
                        print(f"  ⚠️ Ошибка 500, повтор через {RETRY_DELAY}с...")
                        time.sleep(RETRY_DELAY)
                        continue
                    return {
                        'Файл': filename,
                        'Статус': f'Ошибка после {max_retries} попыток',
                        'Ошибка': error_msg
                    }
                else:
                    return {
                        'Файл': filename,
                        'Статус': f'HTTP {response.status_code}',
                        'Ошибка': response.text[:200]
                    }
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"  ⚠️ Ошибка: {str(e)[:50]}, повтор...")
                time.sleep(RETRY_DELAY)
                continue
            return {
                'Файл': filename,
                'Статус': 'Ошибка',
                'Ошибка': str(e)[:200]
            }
    
    return {'Файл': filename, 'Статус': 'Неизвестная ошибка'}

def main():
    invoices_dir = Path('/Users/stanislavtkachev/Dropbox/Glazing CRM/ProjectCRM/docs/invoices')
    output_file = 'docs/invoices/результаты_API.csv'
    
    # Загружаем уже обработанные файлы, если есть
    processed_files = set()
    if Path(output_file).exists():
        try:
            existing_df = pd.read_csv(output_file, encoding='utf-8-sig')
            processed_files = set(existing_df['Файл'].tolist())
            results = existing_df.to_dict('records')
            print(f"📂 Загружено {len(processed_files)} уже обработанных файлов")
        except:
            results = []
    else:
        results = []
    
    print("\n🚀 Пакетная обработка счетов")
    print("=" * 80)
    
    # Проверяем сервер
    try:
        requests.get("http://localhost:3000", timeout=5)
        print("✅ Сервер доступен\n")
    except:
        print("❌ Сервер недоступен! Запустите: npm run dev\n")
        return
    
    files = sorted([f for f in invoices_dir.iterdir() if f.is_file()])
    files_to_process = [f for f in files if f.name not in processed_files]
    
    print(f"📁 Всего файлов: {len(files)}")
    print(f"✅ Уже обработано: {len(processed_files)}")
    print(f"⏳ К обработке: {len(files_to_process)}")
    print("=" * 80)
    
    if not files_to_process:
        print("\n✨ Все файлы уже обработаны!")
        return
    
    for idx, file_path in enumerate(files_to_process, 1):
        print(f"\n[{idx}/{len(files_to_process)}] 📄 {file_path.name}")
        
        result = process_with_retry(file_path)
        
        # Выводим результат
        if result.get('Статус') == 'Успешно':
            print(f"  ✅ Номер: {result.get('Номер счета (API)')}, "
                  f"Дата: {result.get('Дата (API)')}, "
                  f"Сумма: {result.get('Сумма (API)')}")
        else:
            print(f"  ❌ {result.get('Статус')}")
            if result.get('Ошибка'):
                print(f"     {result.get('Ошибка')[:100]}")
        
        results.append(result)
        
        # Сохраняем после каждого файла
        df = pd.DataFrame(results)
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        # Пауза между запросами
        if idx < len(files_to_process):
            time.sleep(2)
    
    print("\n" + "=" * 80)
    print("💾 Результаты сохранены в:", output_file)
    
    # Статистика
    df = pd.DataFrame(results)
    successful = len(df[df['Статус'] == 'Успешно'])
    skipped = len(df[df['Статус'].str.contains('Пропущен', na=False)])
    failed = len(df) - successful - skipped
    
    print(f"\n📊 Статистика:")
    print(f"  Всего: {len(results)}")
    print(f"  ✅ Успешно: {successful}")
    print(f"  ⏭️  Пропущено: {skipped}")
    print(f"  ❌ Ошибок: {failed}")
    
    # Также JSON
    json_output = output_file.replace('.csv', '.json')
    with open(json_output, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"  📄 JSON: {json_output}")

if __name__ == "__main__":
    main()
