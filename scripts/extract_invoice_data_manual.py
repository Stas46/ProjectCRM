#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ручное извлечение данных из счетов для создания эталонной таблицы
"""

import fitz  # PyMuPDF
import pandas as pd
import re
from pathlib import Path
import openpyxl
from datetime import datetime

def extract_text_from_pdf(pdf_path):
    """Извлекает весь текст из PDF"""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text

def extract_text_from_excel(excel_path):
    """Извлекает текст из Excel"""
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    text = ""
    for sheet in wb:
        for row in sheet.iter_rows():
            for cell in row:
                if cell.value:
                    text += str(cell.value) + " "
            text += "\n"
    return text

def extract_invoice_number(text, filename):
    """Извлекает номер счета"""
    # Паттерны для номера счета
    patterns = [
        r'Счет.*?№\s*(\d+)',
        r'счет.*?№\s*(\d+)',
        r'№\s*(\d+)\s+от',
        r'Счет\s+на\s+оплату\s+№\s*(\d+)',
        r'покупателю\s+(\d+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    
    # Если не нашли в тексте, попробуем из имени файла
    filename_match = re.search(r'№?\s*(\d+)', filename)
    if filename_match:
        return filename_match.group(1)
    
    return None

def extract_date(text, filename):
    """Извлекает дату счета"""
    # Паттерны для даты
    patterns = [
        r'от\s+(\d{1,2})[.\s]+(\w+)[.\s]+(\d{2,4})',
        r'от\s+(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})',
        r'(\d{1,2})[./](\d{1,2})[./](\d{2,4})',
    ]
    
    months = {
        'январ': '01', 'феврал': '02', 'март': '03', 'апрел': '04',
        'ма': '05', 'июн': '06', 'июл': '07', 'август': '08',
        'сентяб': '09', 'октяб': '10', 'ноябр': '11', 'декаб': '12'
    }
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            day = match.group(1).zfill(2)
            month_or_num = match.group(2)
            year = match.group(3)
            
            # Преобразуем год в 4 цифры
            if len(year) == 2:
                year = '20' + year
            
            # Преобразуем месяц
            if month_or_num.isdigit():
                month = month_or_num.zfill(2)
            else:
                # Ищем месяц в словаре
                month = None
                for m_name, m_num in months.items():
                    if m_name in month_or_num.lower():
                        month = m_num
                        break
                if not month:
                    continue
            
            return f"{day}.{month}.{year}"
    
    return None

def extract_contractor(text):
    """Извлекает контрагента"""
    # Ищем после "Поставщик:"
    supplier_match = re.search(r'Поставщик:\s*([^,\n]+)', text, re.IGNORECASE)
    if supplier_match:
        return supplier_match.group(1).strip()
    
    # Ищем ООО/ИП в начале
    org_match = re.search(r'((?:ООО|ИП|АО)\s+["\']?[^"\',\n]+)', text)
    if org_match:
        return org_match.group(1).strip()
    
    return None

def extract_total_amount(text):
    """Извлекает общую сумму"""
    # Паттерны для суммы
    patterns = [
        r'Итого:\s*([\d\s]+[,.]?\d*)',
        r'Всего:\s*([\d\s]+[,.]?\d*)',
        r'К\s+оплате:\s*([\d\s]+[,.]?\d*)',
        r'Сумма:\s*([\d\s]+[,.]?\d*)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(' ', '').replace(',', '.')
            try:
                return float(amount_str)
            except:
                continue
    
    return None

def extract_vat(text):
    """Извлекает сумму НДС"""
    vat_match = re.search(r'НДС\s*(?:20%)?[:\s]*([\d\s]+[,.]?\d*)', text, re.IGNORECASE)
    if vat_match:
        vat_str = vat_match.group(1).replace(' ', '').replace(',', '.')
        try:
            return float(vat_str)
        except:
            pass
    return None

def process_invoice_file(file_path):
    """Обрабатывает один файл счета"""
    filename = file_path.name
    print(f"\n📄 {filename}")
    
    # Извлекаем текст
    if file_path.suffix.lower() == '.pdf':
        text = extract_text_from_pdf(str(file_path))
    elif file_path.suffix.lower() in ['.xlsx', '.xls']:
        text = extract_text_from_excel(str(file_path))
    elif file_path.suffix.lower() in ['.jpeg', '.jpg']:
        print("  ⚠️ Изображение - пропускаем (нужен OCR)")
        return None
    else:
        print(f"  ⚠️ Неизвестный формат: {file_path.suffix}")
        return None
    
    # Извлекаем данные
    invoice_number = extract_invoice_number(text, filename)
    date = extract_date(text, filename)
    contractor = extract_contractor(text)
    total_amount = extract_total_amount(text)
    vat = extract_vat(text)
    
    print(f"  Номер: {invoice_number}")
    print(f"  Дата: {date}")
    print(f"  Контрагент: {contractor}")
    print(f"  Сумма: {total_amount}")
    print(f"  НДС: {vat}")
    
    return {
        'Файл': filename,
        'Номер счета': invoice_number,
        'Дата': date,
        'Контрагент': contractor,
        'Сумма': total_amount,
        'НДС': vat,
        'Текст (первые 500 символов)': text[:500].replace('\n', ' ')
    }

def main():
    invoices_dir = Path('/Users/stanislavtkachev/Dropbox/Glazing CRM/ProjectCRM/docs/invoices')
    
    print("🚀 Начинаю извлечение данных из счетов...")
    print("=" * 80)
    
    results = []
    
    # Обрабатываем все файлы
    for file_path in sorted(invoices_dir.iterdir()):
        if file_path.is_file():
            result = process_invoice_file(file_path)
            if result:
                results.append(result)
    
    # Сохраняем в CSV
    df = pd.DataFrame(results)
    output_path = 'docs/invoices/эталонная_таблица.csv'
    df.to_csv(output_path, index=False, encoding='utf-8-sig')
    
    print("\n" + "=" * 80)
    print(f"✅ Обработано файлов: {len(results)}")
    print(f"💾 Сохранено в: {output_path}")
    
    # Выводим статистику
    print(f"\n📊 Статистика:")
    print(f"  Номер найден: {df['Номер счета'].notna().sum()} из {len(results)}")
    print(f"  Дата найдена: {df['Дата'].notna().sum()} из {len(results)}")
    print(f"  Контрагент найден: {df['Контрагент'].notna().sum()} из {len(results)}")
    print(f"  Сумма найдена: {df['Сумма'].notna().sum()} из {len(results)}")

if __name__ == "__main__":
    main()
