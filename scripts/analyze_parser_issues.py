#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Анализ эталонной таблицы и выявление проблем парсера
"""

import pandas as pd
import re

def analyze_reference_data():
    """Анализирует эталонные данные и выявляет паттерны"""
    
    df = pd.read_csv('docs/invoices/эталонная_таблица.csv', encoding='utf-8-sig')
    
    print("=" * 80)
    print("📊 АНАЛИЗ ЭТАЛОННОЙ ТАБЛИЦЫ")
    print("=" * 80)
    
    total = len(df)
    
    print(f"\n📁 Всего файлов: {total}")
    print(f"\n✅ УСПЕШНОСТЬ ИЗВЛЕЧЕНИЯ:")
    print(f"  Номер счета:  {df['Номер счета'].notna().sum()}/{total} ({df['Номер счета'].notna().sum()/total*100:.1f}%)")
    print(f"  Дата:         {df['Дата'].notna().sum()}/{total} ({df['Дата'].notna().sum()/total*100:.1f}%)")
    print(f"  Контрагент:   {df['Контрагент'].notna().sum()}/{total} ({df['Контрагент'].notna().sum()/total*100:.1f}%)")
    print(f"  Сумма:        {df['Сумма'].notna().sum()}/{total} ({df['Сумма'].notna().sum()/total*100:.1f}%)")
    print(f"  НДС:          {df['НДС'].notna().sum()}/{total} ({df['НДС'].notna().sum()/total*100:.1f}%)")
    
    print(f"\n❌ ПРОБЛЕМНЫЕ ФАЙЛЫ (нет даты):")
    no_date = df[df['Дата'].isna()]
    for idx, row in no_date.iterrows():
        print(f"  - {row['Файл']}")
        # Анализируем имя файла
        filename = row['Файл']
        if 'от' in filename:
            date_match = re.search(r'от\s+(\d{1,2})\s+(\w+)\s+(\d{2})', filename)
            if date_match:
                print(f"    💡 В имени файла есть дата: {date_match.group(0)}")
    
    print(f"\n❌ ПРОБЛЕМНЫЕ ФАЙЛЫ (нет контрагента):")
    no_contractor = df[df['Контрагент'].isna()]
    for idx, row in no_contractor.iterrows():
        print(f"  - {row['Файл']}")
        # Анализируем имя файла
        filename = row['Файл']
        # Извлекаем название компании из имени файла
        company_match = re.match(r'([А-Яа-я\-\s]+)', filename)
        if company_match:
            company = company_match.group(1).strip()
            if company and not company.startswith('Счет') and not company.startswith('Акт'):
                print(f"    💡 Возможно компания: {company}")
    
    print(f"\n❌ ПРОБЛЕМНЫЕ ФАЙЛЫ (нет суммы):")
    no_amount = df[df['Сумма'].isna()]
    for idx, row in no_amount.iterrows():
        print(f"  - {row['Файл']}")
    
    print(f"\n📋 ПАТТЕРНЫ НОМЕРОВ СЧЕТОВ:")
    numbers = df[df['Номер счета'].notna()]['Номер счета'].astype(str)
    print(f"  Только цифры: {sum(n.isdigit() for n in numbers)}")
    print(f"  С буквами: {sum(not n.isdigit() for n in numbers)}")
    print(f"  Примеры длинных номеров:")
    for n in numbers:
        if len(n) > 8:
            print(f"    - {n}")
    
    print(f"\n📋 ТИПЫ ФАЙЛОВ:")
    file_types = {}
    for filename in df['Файл']:
        if 'Счет' in filename:
            file_types['Счета'] = file_types.get('Счета', 0) + 1
        elif 'Акт' in filename:
            file_types['Акты'] = file_types.get('Акты', 0) + 1
        elif filename.endswith('.xlsx'):
            file_types['Excel'] = file_types.get('Excel', 0) + 1
        elif filename.endswith('.pdf'):
            file_types['PDF (скан)'] = file_types.get('PDF (скан)', 0) + 1
        elif filename.endswith('.jpeg') or filename.endswith('.jpg'):
            file_types['JPEG'] = file_types.get('JPEG', 0) + 1
    
    for ftype, count in file_types.items():
        print(f"  {ftype}: {count}")
    
    print("\n" + "=" * 80)
    print("💡 РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ ПАРСЕРА:")
    print("=" * 80)
    
    print("\n1️⃣ УЛУЧШИТЬ ИЗВЛЕЧЕНИЕ ДАТЫ:")
    print("  - Добавить парсинг даты из имени файла (для сканов)")
    print("  - Поддержка формата: 'от ДД месяц ГГ'")
    print("  - Примеры: 'от 24 октя 25', 'от 17 октяб 25', 'от 1311,25'")
    
    print("\n2️⃣ УЛУЧШИТЬ ИЗВЛЕЧЕНИЕ КОНТРАГЕНТА:")
    print("  - Для сканированных файлов - извлекать из имени файла")
    print("  - Примеры названий компаний:")
    for filename in no_contractor['Файл'].head(5):
        company_match = re.match(r'([А-Яа-я\-\s]+)', filename)
        if company_match:
            print(f"    - {company_match.group(1).strip()}")
    
    print("\n3️⃣ УЛУЧШИТЬ ИЗВЛЕЧЕНИЕ СУММЫ:")
    print("  - Для актов выполненных работ суммы нет (это нормально)")
    print("  - Для сканов нужен качественный OCR")
    print("  - Проверить паттерны: 'Итого:', 'Всего:', 'К оплате:'")
    
    print("\n4️⃣ ОБРАБОТКА СПЕЦИАЛЬНЫХ СЛУЧАЕВ:")
    print("  - Акты выполненных работ - это не счета (разный формат)")
    print("  - Excel файлы требуют особой обработки")
    print("  - JPEG файлы нужно обрабатывать через OCR")
    
    print("\n5️⃣ ПРОБЛЕМА С OCR:")
    print("  - Google Vision API не работает стабильно")
    print("  - Возможные причины:")
    print("    * Лимит квоты API")
    print("    * Проблемы с авторизацией")
    print("    * Сетевые проблемы")
    print("  - Решение: проверить credentials и квоту Google Cloud")
    
    print("\n" + "=" * 80)
    
    # Сохраняем отчет
    with open('docs/invoices/АНАЛИЗ_ПАРСЕРА.txt', 'w', encoding='utf-8') as f:
        f.write("АНАЛИЗ ПРОБЛЕМ ПАРСЕРА СЧЕТОВ\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Всего файлов: {total}\n\n")
        f.write("СТАТИСТИКА ИЗВЛЕЧЕНИЯ:\n")
        f.write(f"  Номер счета:  {df['Номер счета'].notna().sum()}/{total}\n")
        f.write(f"  Дата:         {df['Дата'].notna().sum()}/{total}\n")
        f.write(f"  Контрагент:   {df['Контрагент'].notna().sum()}/{total}\n")
        f.write(f"  Сумма:        {df['Сумма'].notna().sum()}/{total}\n")
        f.write("\nПРОБЛЕМНЫЕ ФАЙЛЫ:\n")
        f.write("\nБез даты:\n")
        for filename in no_date['Файл']:
            f.write(f"  - {filename}\n")
        f.write("\nБез контрагента:\n")
        for filename in no_contractor['Файл']:
            f.write(f"  - {filename}\n")
    
    print("\n💾 Отчет сохранен в: docs/invoices/АНАЛИЗ_ПАРСЕРА.txt")

if __name__ == "__main__":
    analyze_reference_data()
