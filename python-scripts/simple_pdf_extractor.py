#!/usr/bin/env python3
"""
Simple PDF Text Extractor
Простой извлекатель текста из PDF без внешних зависимостей
"""

import sys
import os
import json
import base64
import re
from pathlib import Path
import argparse

def extract_text_simple(pdf_path):
    """Улучшенное извлечение текста из PDF путем анализа структуры"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_content = file.read()
        
        # Конвертируем в строку для поиска
        pdf_text = pdf_content.decode('latin1', errors='ignore')
        
        print(f"DEBUG: PDF размер: {len(pdf_content)} байт")
        
        # Ищем текстовые объекты в PDF
        text_objects = []
        raw_matches = []
        
        # Расширенные паттерны для поиска текста
        patterns = [
            (r'BT\s+(.*?)\s+ET', 'BT_ET_blocks'),  # Текстовые блоки между BT и ET
            (r'\((.*?)\)\s*Tj', 'simple_Tj'),      # Простой текст с Tj
            (r'\[(.*?)\]\s*TJ', 'array_TJ'),       # Массивы текста с TJ
            (r'\((.*?)\)\s*TJ', 'simple_TJ'),      # Простой текст с TJ
            (r'>\s*BDC\s+(.*?)\s+EMC', 'BDC_EMC'), # Блоки содержимого
            (r'/F\d+\s+\d+\s+Tf\s+(.*?)(?=\s*/F|\s*BT|\s*ET|$)', 'font_text'), # Текст после установки шрифта
        ]
        
        for pattern, pattern_name in patterns:
            matches = re.findall(pattern, pdf_text, re.DOTALL | re.IGNORECASE)
            for match in matches:
                raw_matches.append((pattern_name, match[:100]))  # Для отладки
                
                # Очищаем от PDF команд и символов
                clean_text = match
                
                # Удаляем PDF команды
                clean_text = re.sub(r'\b(?:Td|TD|Tm|TL|Tc|Tw|Tz|TZ|Ts|Tr|gs|G|g|RG|rg|K|k|CS|cs|SC|sc|SCN|scn|sh|Do|BI|ID|EI|q|Q|cm|w|J|j|M|d|ri|i|n|h|v|y|c|s|S|f|F|B)\b', '', clean_text)
                
                # Удаляем числовые команды
                clean_text = re.sub(r'\b\d+(?:\.\d+)?\s+(?:\d+(?:\.\d+)?\s+)*(?:Td|TD|Tm|TL|Tc|Tw|Tz|TZ|Ts|Tr|gs|G|g|RG|rg|K|k|CS|cs|SC|sc|SCN|scn|sh|Do|BI|ID|EI|q|Q|cm|w|J|j|M|d|ri|i|n|h|v|y|c|s|S|f|F|B)', '', clean_text)
                
                # Удаляем служебные символы, но оставляем кириллицу
                clean_text = re.sub(r'[^\w\s\.,:;!?\-а-яёА-ЯЁ0-9]', ' ', clean_text)
                
                # Разбиваем на слова и фильтруем
                words = clean_text.split()
                valid_words = []
                
                for word in words:
                    # Оставляем слова с буквами (русскими или английскими) или числа
                    if (len(word) > 1 and 
                        (re.search(r'[а-яёА-ЯЁa-zA-Z]', word) or word.isdigit())):
                        valid_words.append(word)
                
                if valid_words:
                    text_objects.extend(valid_words)
        
        # Дополнительно ищем строки вида (текст)
        parentheses_pattern = r'\(([^)]+)\)'
        parentheses_matches = re.findall(parentheses_pattern, pdf_text)
        
        for match in parentheses_matches:
            # Декодируем escape-последовательности
            decoded = match.replace('\\\\', '\\').replace('\\(', '(').replace('\\)', ')')
            
            # Проверяем на наличие кириллицы или осмысленного текста
            if re.search(r'[а-яёА-ЯЁ]', decoded) or (len(decoded) > 3 and re.search(r'[a-zA-Z0-9]', decoded)):
                words = decoded.split()
                for word in words:
                    if len(word) > 1:
                        text_objects.append(word)
        
        # Удаляем дубликаты, сохраняя порядок
        seen = set()
        unique_objects = []
        for obj in text_objects:
            if obj not in seen and len(obj.strip()) > 1:
                seen.add(obj)
                unique_objects.append(obj.strip())
        
        # Объединяем в один текст
        full_text = ' '.join(unique_objects)
        
        print(f"DEBUG: Найдено {len(raw_matches)} сырых совпадений")
        print(f"DEBUG: Извлечено {len(unique_objects)} уникальных объектов")
        print(f"DEBUG: Примеры: {unique_objects[:5]}")
        
        return {
            "success": True,
            "full_text": full_text,
            "text_objects": unique_objects[:50],  # Первые 50 объектов
            "objects_count": len(unique_objects),
            "raw_matches_count": len(raw_matches),
            "debug_info": f"Patterns matched: {len(raw_matches)}, Unique objects: {len(unique_objects)}"
        }
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "full_text": "",
            "text_objects": [],
            "objects_count": 0
        }

def analyze_text_simple(text):
    """Простой анализ текста"""
    if not text:
        return {}
    
    # Подсчет статистики
    words = text.split()
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Поиск паттернов
    russian_words = re.findall(r'[а-яё]+', text, re.IGNORECASE)
    numbers = re.findall(r'\d+', text)
    dates = re.findall(r'\d{1,2}[./-]\d{1,2}[./-]\d{2,4}', text)
    amounts = re.findall(r'\d+[\s,.]?\d*\s*(руб|₽|RUB|рублей)', text, re.IGNORECASE)
    
    return {
        "total_chars": len(text),
        "total_words": len(words),
        "total_lines": len(lines),
        "russian_words": len(russian_words),
        "numbers_found": len(numbers),
        "dates_found": len(dates),
        "amounts_found": len(amounts),
        "sample_russian_words": russian_words[:10],
        "sample_dates": dates[:5],
        "sample_amounts": amounts[:5],
        "sample_text": text[:500] + "..." if len(text) > 500 else text
    }

def create_text_report(pdf_filename, text_extraction, text_analysis):
    """Создает текстовый отчет"""
    report = []
    report.append(f"=== PDF АНАЛИЗ: {pdf_filename} ===")
    report.append("")
    
    if text_extraction.get("success"):
        report.append("📊 СТАТИСТИКА:")
        if text_analysis:
            report.append(f"   • Символов: {text_analysis.get('total_chars', 0)}")
            report.append(f"   • Слов: {text_analysis.get('total_words', 0)}")
            report.append(f"   • Строк: {text_analysis.get('total_lines', 0)}")
            report.append(f"   • Русских слов: {text_analysis.get('russian_words', 0)}")
            report.append(f"   • Чисел: {text_analysis.get('numbers_found', 0)}")
            report.append(f"   • Дат: {text_analysis.get('dates_found', 0)}")
            report.append(f"   • Сумм: {text_analysis.get('amounts_found', 0)}")
        
        report.append("")
        
        # Найденные данные
        if text_analysis and text_analysis.get('sample_dates'):
            report.append("📅 НАЙДЕННЫЕ ДАТЫ:")
            for date in text_analysis['sample_dates']:
                report.append(f"   • {date}")
            report.append("")
        
        if text_analysis and text_analysis.get('sample_amounts'):
            report.append("💰 НАЙДЕННЫЕ СУММЫ:")
            for amount in text_analysis['sample_amounts']:
                report.append(f"   • {amount}")
            report.append("")
        
        if text_analysis and text_analysis.get('sample_russian_words'):
            report.append("📝 ПРИМЕРЫ СЛОВ:")
            words_line = ", ".join(text_analysis['sample_russian_words'])
            report.append(f"   {words_line}")
            report.append("")
        
        # Образец текста
        if text_analysis and text_analysis.get('sample_text'):
            report.append("📄 ОБРАЗЕЦ ТЕКСТА:")
            report.append("   " + text_analysis['sample_text'].replace('\n', '\n   '))
            report.append("")
        
        # Все найденные текстовые объекты
        if text_extraction.get('text_objects'):
            report.append("🔍 НАЙДЕННЫЕ ТЕКСТОВЫЕ ОБЪЕКТЫ:")
            for i, obj in enumerate(text_extraction['text_objects'], 1):
                report.append(f"   {i}. {obj}")
    
    else:
        report.append("❌ ОШИБКА ИЗВЛЕЧЕНИЯ ТЕКСТА:")
        report.append(f"   {text_extraction.get('error', 'Неизвестная ошибка')}")
    
    return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description='Simple PDF Text Extractor')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--extract-text', action='store_true', help='Extract text from PDF')
    parser.add_argument('--create-report', action='store_true', help='Create text report')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.pdf_path):
        print(json.dumps({"success": False, "error": "PDF file not found"}, ensure_ascii=False))
        return
    
    result = {
        "success": True,
        "pdf_path": args.pdf_path,
        "filename": os.path.basename(args.pdf_path),
        "converter": "Simple Python Extractor"
    }
    
    # Извлечение текста
    if args.extract_text:
        text_result = extract_text_simple(args.pdf_path)
        result["text_extraction"] = text_result
        
        if text_result.get("success") and text_result.get("full_text"):
            text_analysis = analyze_text_simple(text_result["full_text"])
            result["text_analysis"] = text_analysis
            
            # Создание отчета
            if args.create_report:
                report = create_text_report(
                    result["filename"],
                    text_result,
                    text_analysis
                )
                result["text_report"] = report
    
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()