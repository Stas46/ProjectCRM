#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Окончательный парсер счетов с улучшенным распознаванием русского текста
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


class UltimateInvoiceParser:
    """Окончательная версия парсера счетов с максимально точным распознаванием"""
    
    def __init__(self, debug=False):
        self.debug = debug
        
        # Русские месяцы для преобразования дат
        self.russian_months = {
            'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
            'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
            'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
        }
    
    def clean_text(self, text: str) -> str:
        """Очищает и нормализует текст"""
        if not text:
            return ""
        
        # Заменяем различные виды пробелов и переносов
        text = re.sub(r'\s+', ' ', text)
        text = text.replace('\xa0', ' ')  # Неразрывный пробел
        text = text.replace('\u00a0', ' ')
        
        return text.strip()
    
    def extract_invoice_number(self, text: str) -> Optional[str]:
        """Извлекает номер счета"""
        patterns = [
            # Счет-договор
            r'СЧЁТ[-\s]*ДОГОВОР.*?№\s*(\d+)',
            r'СЧЕТ[-\s]*ДОГОВОР.*?№\s*(\d+)',
            
            # Обычный счет
            r'СЧЁТ.*?№\s*(\d+)',
            r'СЧЕТ.*?№\s*(\d+)',
            r'№\s*(\d+)\s*от\s*\d',
            r'счет.*?№\s*(\d+)',
            r'Invoice.*?№\s*(\d+)',
            
            # Номер в начале документа
            r'№\s*(\d{2,8})\s*от',
            r'№\s*(\d{2,8})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                number = match.group(1).strip()
                if self.debug:
                    print(f"Найден номер счета: {number}")
                return number
        
        return None
    
    def extract_date(self, text: str) -> Optional[str]:
        """Извлекает дату счета"""
        patterns = [
            r'(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})',
            r'(\d{1,2})\.(\d{1,2})\.(\d{4})',
            r'(\d{1,2})/(\d{1,2})/(\d{4})',
            r'(\d{4})-(\d{1,2})-(\d{1,2})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                groups = match.groups()
                if len(groups) == 3:
                    day, month, year = groups
                    # Если месяц - название на русском
                    if month.lower() in self.russian_months:
                        month_num = self.russian_months[month.lower()]
                        date_str = f"{year}-{month_num}-{day.zfill(2)}"
                        if self.debug:
                            print(f"Найдена дата: {date_str}")
                        return date_str
                    # Если месяц - число
                    elif month.isdigit():
                        date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                        if self.debug:
                            print(f"Найдена дата: {date_str}")
                        return date_str
        
        return None
    
    def extract_due_date(self, text: str) -> Optional[str]:
        """Извлекает дату оплаты"""
        patterns = [
            r'(?:оплатить|оплата).*?не\s+позднее\s+(\d{1,2})\.(\d{1,2})\.(\d{4})',
            r'не\s+позднее\s+(\d{1,2})\.(\d{1,2})\.(\d{4})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                day, month, year = match.groups()
                date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                if self.debug:
                    print(f"Найдена дата оплаты: {date_str}")
                return date_str
        
        return None
    
    def extract_contractor_name(self, text: str) -> Optional[str]:
        """Извлекает название организации-поставщика"""
        patterns = [
            # Поставщик с полным названием
            r'Поставщик:?\s*([^\n\r]+?)(?:\s*ИНН|\s*$)',
            r'Исполнитель:?\s*([^\n\r]+?)(?:\s*ИНН|\s*$)',
            
            # Получатель до банка
            r'Получатель\s+(.+?)\s+Банк получателя',
            r'Получатель\s+(.+?)(?:\s+БИК|\s+Банк)',
            
            # ООО в кавычках и без
            r'ООО\s*"([^"]+)"',
            r'ООО\s+([А-Яа-яЁё][А-Яа-яЁё\s\-\d]+?)(?:\s*,|\s*ИНН|\s*$)',
            
            # ИП
            r'ИП\s+([А-Яа-яЁё\s]+?)(?:\s*ИНН|\s*$)',
            
            # НПД
            r'Продавец\s+([А-Яа-яЁё\s]+?)\s+Режим',
            
            # Общие паттерны для названий в кавычках
            r'"([А-Яа-яЁё][А-Яа-яЁё\s\-\d]+?)"',
            
            # Названия из известных компаний
            r'(АлРус|Ал-Профи|МЕТАЛЛМАСТЕР-М|Эксперт\s+Рентал\s+Инжиниринг|Петрович)',
            
            # Любое название перед ИНН
            r'([А-Яа-яЁё][А-Яа-яЁё\s\-\d"«»]{5,50}?)\s*ИНН',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            if matches:
                for name in matches:
                    # Очищаем название
                    name = str(name).strip()
                    name = re.sub(r'["\'"«»]+', '', name)  # Убираем кавычки
                    name = re.sub(r'\s+', ' ', name)      # Нормализуем пробелы
                    name = name.replace('000', 'ООО')     # Исправляем опечатки
                    
                    # Убираем лишние слова и числа в конце
                    name = re.sub(r'\s*(?:ИНН|БИК|КПП|ОГРН).*$', '', name, flags=re.IGNORECASE)
                    name = re.sub(r'\s*\d{9,}.*$', '', name)  # Убираем длинные числа
                    
                    # Проверяем качество названия
                    if (len(name) >= 3 and 
                        not name.isdigit() and 
                        not re.match(r'^(Банк|ИНН|КПП|БИК|Счет|Дата|руб)$', name, re.IGNORECASE)):
                        if self.debug:
                            print(f"Найдено название: '{name}'")
                        return name
        
        return None
    
    def extract_total_amount(self, text: str) -> Optional[float]:
        """Извлекает общую сумму"""
        patterns = [
            # Итого с двоеточием
            r'(?:Итого|Всего|ИТОГО|ВСЕГО|Total)[\s:]*([0-9\s,]+[\.,]\d{2})',
            
            # К доплате
            r'(?:к\s*доплате|К\s*ДОПЛАТЕ|к\s*оплате|К\s*ОПЛАТЕ)[\s:]*([0-9\s,]+[\.,]\d{2})',
            
            # Общая стоимость
            r'(?:общая\s*стоимость|ОБЩАЯ\s*СТОИМОСТЬ)[\s:]*([0-9\s,]+[\.,]\d{2})',
            
            # Сумма в конце строки с товаром (последняя)
            r'([0-9\s,]+[\.,]\d{2})\s*$',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            if matches:
                for amount_str in matches:
                    try:
                        # Очищаем и конвертируем сумму
                        amount_clean = amount_str.replace(' ', '').replace(',', '.')
                        amount = float(amount_clean)
                        if amount > 0:
                            if self.debug:
                                print(f"Найдена сумма: {amount}")
                            return amount
                    except ValueError:
                        continue
        
        return None
    
    def extract_vat_info(self, text: str) -> tuple[Optional[float], Optional[float]]:
        """Извлекает информацию о НДС"""
        vat_amount = None
        vat_rate = None
        
        # Поиск НДС
        vat_patterns = [
            r'НДС\s*(\d+)%[:\s]*([0-9\s,]+[\.,]\d{2})',
            r'НДС[:\s]*([0-9\s,]+[\.,]\d{2})',
            r'в\s*том\s*числе\s*НДС[:\s]*([0-9\s,]+[\.,]\d{2})',
            r'В\s*ТОМ\s*ЧИСЛЕ\s*НДС[:\s]*([0-9\s,]+[\.,]\d{2})',
        ]
        
        for pattern in vat_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                try:
                    groups = match.groups()
                    if len(groups) == 2:  # НДС с процентом
                        vat_rate = float(groups[0])
                        vat_amount = float(groups[1].replace(' ', '').replace(',', '.'))
                    else:  # Только сумма НДС
                        vat_amount = float(groups[0].replace(' ', '').replace(',', '.'))
                    break
                except ValueError:
                    continue
        
        # Если не нашли ставку, попробуем вычислить
        if vat_amount and not vat_rate:
            total_amount = self.extract_total_amount(text)
            if total_amount:
                try:
                    calculated_rate = (vat_amount / (total_amount - vat_amount)) * 100
                    if abs(calculated_rate - 20) < 1:  # Близко к 20%
                        vat_rate = 20.0
                    elif abs(calculated_rate - 10) < 1:  # Близко к 10%
                        vat_rate = 10.0
                except ValueError:
                    pass
        
        if self.debug and (vat_amount or vat_rate):
            print(f"Найден НДС: {vat_amount}, ставка: {vat_rate}%")
        
        return vat_amount, vat_rate
    
    def extract_items(self, text: str) -> List[Dict[str, Any]]:
        """Извлекает товарные позиции с улучшенным парсингом таблиц"""
        items = []
        
        # Улучшенные паттерны для поиска начала таблицы товаров
        header_patterns = [
            r'(?:№|No)\s*п/п.*?(?:Наименование|Товар).*?(?:Кол|Количество).*?(?:Цена|Стоимость)',
            r'№.*?Наименование.*?Количество.*?Цена.*?Сумма',
            r'No.*?Товары.*?услуги.*?Кол-во.*?Цена.*?Сумма',
            r'№.*?Товары.*?работы.*?услуги.*?Кол-во.*?Цена.*?Сумма',
            # Поиск первой строки с товаром без заголовка
            r'\n\s*1\s+[А-Яа-яЁё][А-Яа-яЁё\s\-\d,\.\"«»\(\)]{5,}\s+\d+(?:[\.,]\d+)?\s+[А-Яа-я]*\.?\s*[\d\s,]+[\.,]\d{2}',
        ]
        
        table_start_pos = 0
        for pattern in header_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                table_start_pos = match.start()
                if self.debug:
                    print(f"Найден заголовок таблицы: {match.group()[:100]}...")
                break
        
        # Получаем текст таблицы
        table_text = text[table_start_pos:]
        
        # Ищем конец таблицы
        end_patterns = [
            r'(?:Итого|Всего)\s*:?\s*[\d\s,]+[\.,]\d{2}',
            r'К\s*доплате\s*:?\s*[\d\s,]+[\.,]\d{2}',
            r'Общая\s*стоимость\s*:?\s*[\d\s,]+[\.,]\d{2}',
            r'Подпись\s*плательщика',
            r'Руководитель\s*организации',
            r'М\.П\.'
        ]
        
        for pattern in end_patterns:
            match = re.search(pattern, table_text, re.IGNORECASE | re.MULTILINE)
            if match:
                table_text = table_text[:match.start()]
                if self.debug:
                    print(f"Найден конец таблицы: {match.group()}")
                break
        
        if self.debug:
            print(f"Анализируемый текст таблицы ({len(table_text)} символов):\n{table_text[:500]}...")
        
        # Разбиваем на строки и анализируем каждую
        lines = table_text.split('\n')
        
        for line_num, line in enumerate(lines):
            original_line = line
            line = line.strip()
            
            # Пропускаем пустые строки и заголовки
            if (not line or len(line) < 15 or 
                re.match(r'^\s*(?:№|No|Наименование|Товар|Количество|Цена|Сумма)', line, re.IGNORECASE)):
                continue
            
            if self.debug:
                print(f"Анализируем строку {line_num}: {line[:100]}...")
            
            # Усиленные паттерны для разных форматов товарных строк
            item_patterns = [
                # Полный формат: номер название количество единица цена сумма
                r'^(\d+)\s+([А-Яа-яЁё][А-Яа-яЁё\s\-\d,\.\"«»\(\)]+?)\s+(\d+(?:[\.,]\d+)?)\s+([А-Яа-я]+)\.?\s+([\d\s,]+[\.,]\d{2})\s+([\d\s,]+[\.,]\d{2})\s*$',
                
                # Без единиц измерения: номер название количество цена сумма
                r'^(\d+)\s+([А-Яа-яЁё][А-Яа-яЁё\s\-\d,\.\"«»\(\)]+?)\s+(\d+(?:[\.,]\d+)?)\s+([\d\s,]+[\.,]\d{2})\s+([\d\s,]+[\.,]\d{2})\s*$',
                
                # С кодом товара: номер код название количество единица цена сумма
                r'^(\d+)\s+\d+\s+([А-Яа-яЁё][А-Яа-яЁё\s\-\d,\.\"«»\(\)]+?)\s+(\d+(?:[\.,]\d+)?)\s+([А-Яа-я]+)\.?\s+([\d\s,]+[\.,]\d{2})\s+([\d\s,]+[\.,]\d{2})\s*$',
                
                # Формат с разделителями (табы/несколько пробелов)
                r'^(\d+)\s{2,}([А-Яа-яЁё][А-Яа-яЁё\s\-\d,\.\"«»\(\)]+?)\s{2,}(\d+(?:[\.,]\d+)?)\s{2,}([А-Яа-я]*\.?)\s{2,}([\d\s,]+[\.,]\d{2})\s{2,}([\d\s,]+[\.,]\d{2})\s*$',
                
                # Простой формат для услуг без количества: номер услуга сумма
                r'^(\d+)\s+([А-Яа-яЁё][А-Яа-яЁё\s\-\d,\.\"«»\(\)]{15,})\s+([\d\s,]+[\.,]\d{2})\s*$',
                
                # Гибкий паттерн - номер и все остальное
                r'^(\d+)\s+(.+?)\s+([\d\s,]+[\.,]\d{2})\s*$'
            ]
            
            item_found = False
            
            for pattern_num, pattern in enumerate(item_patterns):
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    try:
                        groups = match.groups()
                        num = int(groups[0])
                        
                        if self.debug:
                            print(f"  Паттерн {pattern_num} сработал, группы: {groups}")
                        
                        # Извлекаем название товара
                        name = self.clean_text(groups[1])
                        
                        # Проверяем валидность названия
                        if (not name or len(name) < 3 or name.isdigit() or 
                            re.search(r'\b(?:итого|всего|доплате|подпись)\b', name, re.IGNORECASE)):
                            if self.debug:
                                print(f"    Пропускаем невалидное название: '{name}'")
                            continue
                        
                        # Парсим остальные поля в зависимости от формата
                        if len(groups) == 6:  # полный формат
                            quantity = float(groups[2].replace(',', '.'))
                            unit = groups[3] if groups[3] else 'шт'
                            price = float(groups[4].replace(',', '.').replace(' ', ''))
                            total = float(groups[5].replace(',', '.').replace(' ', ''))
                        elif len(groups) == 5:  # без единиц
                            quantity = float(groups[2].replace(',', '.'))
                            unit = 'шт'
                            price = float(groups[3].replace(',', '.').replace(' ', ''))
                            total = float(groups[4].replace(',', '.').replace(' ', ''))
                        elif len(groups) == 3:  # простой формат - услуга
                            quantity = 1.0
                            unit = 'услуга'
                            total = float(groups[2].replace(',', '.').replace(' ', ''))
                            price = total
                        else:
                            # Пробуем извлечь данные из строки вручную
                            numbers = re.findall(r'[\d\s,]+[\.,]\d{2}', line)
                            if len(numbers) >= 2:
                                quantity = 1.0
                                unit = 'шт'
                                price = float(numbers[-2].replace(',', '.').replace(' ', ''))
                                total = float(numbers[-1].replace(',', '.').replace(' ', ''))
                            else:
                                continue
                        
                        # Добавляем товар
                        item = {
                            'number': num,
                            'name': name,
                            'quantity': quantity,
                            'unit': unit,
                            'price': price,
                            'total': total
                        }
                        
                        items.append(item)
                        item_found = True
                        
                        if self.debug:
                            print(f"  + Добавлен товар {num}: {name[:30]}... | {quantity} {unit} | {price:,.2f} | {total:,.2f}")
                        
                        break
                        
                    except (ValueError, IndexError) as e:
                        if self.debug:
                            print(f"    Ошибка парсинга: {e}")
                        continue
            
            if not item_found and self.debug:
                print(f"  - Строка не распознана как товар")
        
        if self.debug:
            print(f"Всего найдено товаров: {len(items)}")
        
        return items
    
    def parse_invoice(self, text: str) -> Dict[str, Any]:
        """Основной метод парсинга счета"""
        if self.debug:
            print(f"Parsing text length: {len(text)} characters")
        
        # НЕ применяем clean_text к основному тексту - нужны переносы строк для таблиц
        # text = self.clean_text(text)
        
        # Извлекаем все данные
        invoice_number = self.extract_invoice_number(text)
        invoice_date = self.extract_date(text)
        due_date = self.extract_due_date(text)
        contractor_name = self.extract_contractor_name(text)
        total_amount = self.extract_total_amount(text)
        vat_amount, vat_rate = self.extract_vat_info(text)
        items = self.extract_items(text)
        
        if self.debug:
            print(f"Invoice number: {invoice_number}")
            print(f"Contractor: {contractor_name}")
            print(f"VAT amount: {vat_amount}, rate: {vat_rate}")
            print(f"Total: {total_amount}")
            print(f"Items found: {len(items)}")
        
        # Формируем результат
        result = {
            "invoice": {
                "number": invoice_number,
                "date": invoice_date,
                "due_date": due_date,
                "total_amount": total_amount,
                "vat_amount": vat_amount,
                "vat_rate": vat_rate,
                "has_vat": vat_amount is not None and vat_amount > 0
            },
            "contractor": {
                "name": contractor_name,
                "inn": None,  # Можно добавить извлечение ИНН
                "kpp": None,
                "address": None
            },
            "items": items
        }
        
        if self.debug:
            print(f"Parsed: {invoice_number}, {invoice_date}, {contractor_name}")
            print(f"VAT: {vat_amount}, Rate: {vat_rate}, Items: {len(items)}")
        
        return result


def main():
    parser = argparse.ArgumentParser(description='Парсер счетов-фактур')
    parser.add_argument('--text', required=True, help='Текст счета для парсинга')
    parser.add_argument('--output-format', choices=['json', 'readable'], default='readable',
                        help='Формат вывода')
    parser.add_argument('--debug', action='store_true', help='Включить отладочный вывод')
    
    args = parser.parse_args()
    
    invoice_parser = UltimateInvoiceParser()
    invoice_parser.debug = args.debug
    
    result = invoice_parser.parse_invoice(args.text)
    
    if args.output_format == 'json':
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"Номер счета: {result['invoice']['number']}")
        print(f"Дата счета: {result['invoice']['date']}")
        print(f"Сумма: {result['invoice']['total_amount']}")
        print(f"НДС: {result['invoice']['vat_amount']}")
        print(f"Поставщик: {result['contractor']['name']}")
        print(f"Товаров: {len(result['items'])}")


if __name__ == "__main__":
    main()