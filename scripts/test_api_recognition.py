#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Автоматическая обработка всех счетов через /api/smart-invoice
"""

import requests
import json
import time
from pathlib import Path
import pandas as pd

API_URL = "http://localhost:3000/api/smart-invoice"

def process_invoice_via_api(file_path):
    """Отправляет файл в API для распознавания"""
    filename = file_path.name
    print(f"\n📄 {filename}")
    
    # Пропускаем изображения JPEG (для них нужен отдельный OCR)
    if file_path.suffix.lower() in ['.jpeg', '.jpg']:
        print("  ⏭️  Пропускаем изображение")
        return None
    
    try:
        with open(file_path, 'rb') as f:
            files = {
                'file': (filename, f, 'application/octet-stream')
            }
            
            print(f"  📤 Отправка в API...")
            response = requests.post(API_URL, files=files, timeout=120)
            
            if response.status_code == 200:
                result = response.json()
                
                invoice = result.get('invoice', {})
                contractor = result.get('contractor', {})
                
                print(f"  ✅ Распознано:")
                print(f"     Номер: {invoice.get('number')}")
                print(f"     Дата: {invoice.get('date')}")
                print(f"     Контрагент: {contractor.get('name')}")
                print(f"     Сумма: {invoice.get('total_amount')}")
                print(f"     НДС: {invoice.get('vat_amount')}")
                
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
            else:
                error_text = response.text[:200]
                print(f"  ❌ Ошибка API: {response.status_code}")
                print(f"     {error_text}")
                return {
                    'Файл': filename,
                    'Статус': f'Ошибка {response.status_code}',
                    'Ошибка': error_text
                }
                
    except requests.exceptions.ConnectionError:
        print(f"  ❌ Не удается подключиться к API")
        print(f"     Убедитесь, что сервер запущен на http://localhost:3000")
        return {
            'Файл': filename,
            'Статус': 'Нет подключения к серверу'
        }
    except Exception as e:
        print(f"  ❌ Ошибка: {str(e)}")
        return {
            'Файл': filename,
            'Статус': 'Ошибка',
            'Ошибка': str(e)
        }

def main():
    invoices_dir = Path('/Users/stanislavtkachev/Dropbox/Glazing CRM/ProjectCRM/docs/invoices')
    
    print("🚀 Автоматическое распознавание счетов через /api/smart-invoice")
    print("=" * 80)
    print(f"\n⚠️  ВАЖНО: Убедитесь, что сервер запущен (npm run dev)")
    print("=" * 80)
    
    # Проверяем доступность API
    try:
        test_response = requests.get("http://localhost:3000", timeout=5)
        print("\n✅ Сервер доступен")
    except:
        print("\n❌ Сервер недоступен!")
        print("   Запустите сервер: npm run dev")
        return
    
    results = []
    files = sorted([f for f in invoices_dir.iterdir() if f.is_file()])
    
    print(f"\n📁 Найдено файлов: {len(files)}")
    print("=" * 80)
    print("\n💡 Файлы со сканами будут обработаны через Google Vision OCR")
    print("   Это может занять несколько минут...")
    print("=" * 80)
    
    # Создаем промежуточные сохранения каждые 5 файлов
    batch_size = 5
    
    for idx, file_path in enumerate(files, 1):
        print(f"\n[{idx}/{len(files)}] ⏳ Обрабатываю...")
        result = process_invoice_via_api(file_path)
        
        if result:
            results.append(result)
        
        # Промежуточное сохранение
        if idx % batch_size == 0 or idx == len(files):
            temp_df = pd.DataFrame(results)
            temp_output = f'docs/invoices/результаты_API_temp_{idx}.csv'
            temp_df.to_csv(temp_output, index=False, encoding='utf-8-sig')
            print(f"\n💾 Промежуточное сохранение: {idx}/{len(files)} файлов")
        
        # Короткая пауза между запросами
        if idx < len(files):
            time.sleep(1)
    
    # Сохраняем результаты
    print("\n" + "=" * 80)
    print("💾 Сохранение результатов...")
    
    df = pd.DataFrame(results)
    output_path = 'docs/invoices/результаты_API.csv'
    df.to_csv(output_path, index=False, encoding='utf-8-sig')
    
    print(f"✅ Сохранено в: {output_path}")
    
    # Статистика
    successful = sum(1 for r in results if r.get('Статус') == 'Успешно')
    print(f"\n📊 Статистика:")
    print(f"  Всего обработано: {len(results)}")
    print(f"  Успешно: {successful}")
    print(f"  Ошибок: {len(results) - successful}")
    
    # Сохраняем также в JSON для детального анализа
    json_output = 'docs/invoices/результаты_API.json'
    with open(json_output, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"  JSON: {json_output}")

if __name__ == "__main__":
    main()
