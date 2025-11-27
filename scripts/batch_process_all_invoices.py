#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для batch обработки всех счетов через API
"""

import os
import sys
import requests
import json
import csv
import time
from pathlib import Path
from typing import Dict, List, Any

# Конфигурация
API_URL = "http://localhost:3000/api/smart-invoice"
INVOICES_DIR = "docs/invoices"
OUTPUT_FILE = "docs/invoices/результаты_переобработка.csv"
RETRY_COUNT = 3
RETRY_DELAY = 2  # секунды

def get_invoice_files() -> List[str]:
    """Получить список всех файлов счетов"""
    invoice_dir = Path(INVOICES_DIR)
    if not invoice_dir.exists():
        print(f"❌ Директория {INVOICES_DIR} не найдена")
        return []
    
    # Поддерживаемые расширения
    supported_exts = {'.pdf', '.xlsx', '.xls', '.xlsm', '.jpg', '.jpeg', '.png'}
    
    files = []
    for file in sorted(invoice_dir.iterdir()):
        if file.is_file() and file.suffix.lower() in supported_exts:
            files.append(file.name)
    
    return files

def process_invoice(filename: str) -> Dict[str, Any]:
    """Обработать один счет через API"""
    filepath = Path(INVOICES_DIR) / filename
    
    if not filepath.exists():
        return {
            'filename': filename,
            'status': 'NOT_FOUND',
            'error': 'Файл не найден'
        }
    
    # Попытки с retry логикой
    for attempt in range(1, RETRY_COUNT + 1):
        try:
            print(f"  📤 Попытка {attempt}/{RETRY_COUNT}...", end='', flush=True)
            
            with open(filepath, 'rb') as f:
                files = {'file': f}
                response = requests.post(API_URL, files=files, timeout=120)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    parsed = data.get('parsed', {})
                    print(f" ✅")
                    return {
                        'filename': filename,
                        'status': 'SUCCESS',
                        'invoice_number': parsed.get('invoice_number'),
                        'invoice_date': parsed.get('invoice_date'),
                        'total_amount': parsed.get('total_amount'),
                        'vat_amount': parsed.get('vat_amount'),
                        'supplier_name': parsed.get('supplier_name'),
                        'supplier_inn': parsed.get('supplier_inn'),
                    }
                else:
                    error = data.get('error', 'Unknown error')
                    print(f" ❌ {error}")
                    if attempt < RETRY_COUNT:
                        time.sleep(RETRY_DELAY)
                        continue
                    return {
                        'filename': filename,
                        'status': 'FAILED',
                        'error': error
                    }
            else:
                error = f"HTTP {response.status_code}"
                print(f" ❌ {error}")
                if attempt < RETRY_COUNT:
                    time.sleep(RETRY_DELAY)
                    continue
                return {
                    'filename': filename,
                    'status': 'HTTP_ERROR',
                    'error': error,
                    'response': response.text[:200]
                }
                
        except requests.Timeout:
            print(f" ⏱️ Timeout")
            if attempt < RETRY_COUNT:
                time.sleep(RETRY_DELAY * 2)
                continue
            return {
                'filename': filename,
                'status': 'TIMEOUT',
                'error': 'Request timeout'
            }
        except Exception as e:
            error = str(e)
            print(f" ❌ {error}")
            if attempt < RETRY_COUNT:
                time.sleep(RETRY_DELAY)
                continue
            return {
                'filename': filename,
                'status': 'ERROR',
                'error': error
            }
    
    return {
        'filename': filename,
        'status': 'FAILED',
        'error': 'Max retries exceeded'
    }

def save_results(results: List[Dict[str, Any]]) -> None:
    """Сохранить результаты в CSV"""
    if not results:
        print("❌ Нет результатов для сохранения")
        return
    
    # Определяем все возможные колонки
    fieldnames = [
        'filename',
        'status',
        'invoice_number',
        'invoice_date',
        'total_amount',
        'vat_amount',
        'supplier_name',
        'supplier_inn',
        'error',
        'response'
    ]
    
    try:
        with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for result in results:
                writer.writerow(result)
        
        print(f"\n✅ Результаты сохранены в {OUTPUT_FILE}")
    except Exception as e:
        print(f"❌ Ошибка сохранения результатов: {e}")

def main():
    print("=" * 60)
    print("🔄 Batch обработка всех счетов через API")
    print("=" * 60)
    
    # Получаем список файлов
    files = get_invoice_files()
    if not files:
        print("❌ Файлы счетов не найдены")
        return
    
    print(f"\n📂 Найдено {len(files)} файлов для обработки\n")
    
    # Обрабатываем файлы
    results: List[Dict[str, Any]] = []
    success_count = 0
    error_count = 0
    
    for i, filename in enumerate(files, 1):
        print(f"[{i}/{len(files)}] 📄 {filename}")
        result = process_invoice(filename)
        results.append(result)
        
        if result['status'] == 'SUCCESS':
            success_count += 1
            print(f"      ✅ № {result.get('invoice_number')}, {result.get('invoice_date')}, "
                  f"Сумма: {result.get('total_amount')}")
        else:
            error_count += 1
            print(f"      ❌ {result.get('error', 'Unknown error')}")
    
    # Сохраняем результаты
    save_results(results)
    
    # Статистика
    print("\n" + "=" * 60)
    print("📊 СТАТИСТИКА")
    print("=" * 60)
    print(f"✅ Успешно обработано: {success_count}/{len(files)} ({success_count*100//len(files)}%)")
    print(f"❌ Ошибок: {error_count}/{len(files)} ({error_count*100//len(files)}%)")
    print(f"📁 Результаты сохранены в: {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
