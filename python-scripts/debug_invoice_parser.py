#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Окончательный парсер счетов с отладкой - показывает весь текст
"""

import re
import json
import argparse
import sys
from typing import Dict, List, Any, Optional

# Устанавливаем кодировку stdout для Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())


class DebugInvoiceParser:
    """Отладочная версия парсера с полным выводом текста"""
    
    def __init__(self, debug=True):
        self.debug = debug
        
        # Русские месяцы для преобразования дат
        self.russian_months = {
            'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
            'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
            'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
        }
    
    def parse_text(self, text: str) -> Dict[str, Any]:
        """Главный метод парсинга с полным выводом текста"""
        print("=" * 80)
        print("ПОЛНЫЙ ТЕКСТ ДЛЯ ОТЛАДКИ:")
        print("=" * 80)
        print(text)
        print("=" * 80)
        print("ПОИСК ПАТТЕРНОВ:")
        print("=" * 80)
        
        # Поиск сумм
        total_patterns = [
            r'(?:всего\s*к\s*оплате|ВСЕГО\s*К\s*ОПЛАТЕ)[\s:]*([0-9]{1,3}(?:[\s,\.][0-9]{3})*[\.,]\d{2})',
            r'(?:Итого|ИТОГО|Total)[\s:]*([0-9]{1,3}(?:[\s,\.][0-9]{3})*[\.,]\d{2})',
            r'(?:Всего|ВСЕГО)[\s:]*([0-9]{1,3}(?:[\s,\.][0-9]{3})*[\.,]\d{2})',
            r'([0-9]{4,}[\.,]\d{2})\s*руб',
            r'([0-9]{6,}[\.,]\d{2})',
        ]
        
        for i, pattern in enumerate(total_patterns):
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            print(f"Паттерн {i+1}: {pattern}")
            print(f"Найдено: {matches}")
            print()
        
        # Поиск номеров
        number_patterns = [
            r'№\s*([А-ЯЁA-Z]+-\d+)',
            r'СЧЁТ.*?№\s*(\d+)',
            r'СЧЕТ.*?№\s*(\d+)',
            r'№\s*(\d+)',
        ]
        
        for i, pattern in enumerate(number_patterns):
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            print(f"Номер паттерн {i+1}: {pattern}")
            print(f"Найдено: {matches}")
            print()
        
        # Поиск контрагентов
        contractor_patterns = [
            r'(?:Поставщик|ПОСТАВЩИК|Продавец|ПРОДАВЕЦ)[\s:]*([^\n\r]+)',
            r'([А-ЯЁ][а-яё]*(?:\s+[А-ЯЁ][а-яё]*){2,})',  # Название компании
        ]
        
        for i, pattern in enumerate(contractor_patterns):
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            print(f"Контрагент паттерн {i+1}: {pattern}")
            print(f"Найдено: {matches[:5]}")  # Показываем только первые 5
            print()
        
        return {
            "debug": "Отладочная информация выведена выше",
            "text_length": len(text)
        }


def main():
    parser = argparse.ArgumentParser(description='Отладочный парсер счетов')
    parser.add_argument('--file', required=True, help='Путь к текстовому файлу')
    parser.add_argument('--output-format', default='json', help='Формат вывода')
    
    args = parser.parse_args()
    
    try:
        with open(args.file, 'r', encoding='utf-8') as f:
            text = f.read()
        
        parser_instance = DebugInvoiceParser()
        result = parser_instance.parse_text(text)
        
        if args.output_format == 'json':
            print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except FileNotFoundError:
        print(f"Файл не найден: {args.file}")
        sys.exit(1)
    except Exception as e:
        print(f"Ошибка: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()