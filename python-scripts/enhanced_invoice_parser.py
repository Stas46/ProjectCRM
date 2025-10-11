#!/usr/bin/env python3
"""
Enhanced Invoice Parser для русских счетов
Улучшенный анализатор счетов с лучшим распознаванием русского текста
"""

import re
import json
import sys
import argparse
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

@dataclass
class Contractor:
    name: str
    inn: str
    kpp: Optional[str] = None
    address: Optional[str] = None

@dataclass
class InvoiceItem:
    position: int
    name: str
    quantity: float
    unit: str
    price: float
    total: float

@dataclass
class Invoice:
    number: str
    date: str
    contractor: Contractor
    total_amount: float
    vat_amount: Optional[float] = None
    vat_rate: Optional[float] = None
    has_vat: bool = False
    due_date: Optional[str] = None
    items: List[InvoiceItem] = None

class EnhancedInvoiceParser:
    def __init__(self):
        # Улучшенные паттерны для извлечения данных
        self.patterns = {
            'invoice_number': [
                r'[Сс]чет.*?№\s*([А-Я\u0430-\u044f\d/\-]+)',
                r'[Сс]чет.*?N\s*([А-Я\u0430-\u044f\d/\-]+)',
                r'[Сс]чет.*?#\s*([А-Я\u0430-\u044f\d/\-]+)',
                r'[Сс]чет.*?(\d+/\d+)',
                r'[Сс]чет.*?(\d+)',
                r'№\s*([А-Я\u0430-\u044f\d/\-]+).*?от',
                r'№\s*([А-Я\u0430-\u044f\d/\-]+)',
                r'N\s*([А-Я\u0430-\u044f\d/\-]+)',
                r'#\s*([А-Я\u0430-\u044f\d/\-]+)',
                r'(\d+/\d+).*?от'
            ],
            'invoice_date': [
                # Дата с названием месяца
                r'от\s+(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})\s*г?',
                # Дата в формате ДД.ММ.ГГГГ
                r'от\s+(\d{1,2})\.(\d{1,2})\.(\d{4})',
                # Счет на оплату № 15920/1 от 27 августа 2025 г.
                r'Счет.*?№.*?от\s+(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})\s*г?',
                # Общий поиск даты
                r'(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})\s*г?',
                r'(\d{1,2})\.(\d{1,2})\.(\d{4})'
            ],
            'due_date': [
                r'[Оо]платить.*?не позднее\s+(\d{1,2})\.(\d{1,2})\.(\d{4})',
                r'[Сс]рок.*?оплаты.*?(\d{1,2})\.(\d{1,2})\.(\d{4})',
                r'[Дд]о\s+(\d{1,2})\.(\d{1,2})\.(\d{4})',
                r'не позднее\s+(\d{1,2})\.(\d{1,2})\.(\d{4})'
            ],
            'contractor_name': [
                r'ООО\s+"([^"]+)"',
                r'ООО\s+([^,\n]+?)(?:,|\n|ИНН)',
                r'ИП\s+([^,\n]+?)(?:,|\n|ИНН)',
                r'Поставщик[:\s]*([^,\n]+?)(?:,|\n|ИНН)',
                r'Исполнитель[:\s]*([^,\n]+?)(?:,|\n|ИНН)',
                r'"([А-ЯЁ][^"]+)".*?ИНН',
                r'КОМПАНИЯ\s+([А-ЯЁ\s]+?)(?:,|\n|ИНН)'
            ],
            'inn': [
                r'ИНН\s*(\d{10,12})',
                r'INN\s*(\d{10,12})'
            ],
            'kpp': [
                r'КПП\s*(\d{9})',
                r'KPP\s*(\d{9})'
            ],
            'total_amount': [
                r'[Вв]сего.*?к.*?оплате[:\s]*(\d+(?:\s\d{3})*[.,]\d{2})',
                r'[Ии]того[:\s]*(\d+(?:\s\d{3})*[.,]\d{2})',
                r'Total[:\s]*(\d+(?:\s\d{3})*[.,]\d{2})',
                r'(\d+(?:\s\d{3})*[.,]\d{2}).*?руб',
                # Для случая "2 269,86"
                r'(\d+(?:\s\d{3})*,\d{2})(?=\s*руб|\s*$|\s*\n)'
            ],
            'vat_amount': [
                r'В\s*том\s*числе\s*НДС\s*\d+%[:\s]*(\d+(?:\s\d{3})*[.,]\d{2})',
                r'НДС\s*\d+%[:\s]*(\d+(?:\s\d{3})*[.,]\d{2})',
                r'том\s*числе\s*НДС[:\s]*(\d+(?:\s\d{3})*[.,]\d{2})',
                r'VAT[:\s]*(\d+(?:\s\d{3})*[.,]\d{2})'
            ],
            'vat_rate': [
                r'НДС\s*(\d{1,2})%',
                r'VAT\s*(\d{1,2})%',
                r'том\s*числе\s*НДС\s*(\d{1,2})%'
            ]
        }
        
        # Месяцы для парсинга дат
        self.months = {
            'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
            'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
            'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
        }

    def extract_field(self, text, field_name):
        """Извлекаем поле по паттернам"""
        patterns = self.patterns.get(field_name, [])
        
        if field_name == 'invoice_number':
            print(f"Searching for invoice number in: '{text[:100]}...'")
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                if field_name == 'invoice_number':
                    print(f"Found match with pattern '{pattern}': {match.group(1)}")
                if field_name in ['invoice_date', 'due_date'] and len(match.groups()) >= 3:
                    # Обработка дат с месяцами
                    day, month, year = match.groups()[:3]
                    if month in self.months:
                        return f"{day.zfill(2)}.{self.months[month]}.{year}"
                    else:
                        return f"{day.zfill(2)}.{month.zfill(2)}.{year}"
                elif field_name == 'contractor_name':
                    # Очищаем название контрагента
                    name = match.group(1).strip()
                    name = re.sub(r'\s+', ' ', name)  # Убираем лишние пробелы
                    name = name.replace('"', '').replace('«', '').replace('»', '')
                    return name
                else:
                    return match.group(1).strip()
        
        return None

    def normalize_amount(self, amount_str):
        """Нормализуем денежную сумму"""
        if not amount_str:
            return 0.0
        
        # Убираем пробелы между разрядами и заменяем запятую на точку
        amount_str = re.sub(r'\s+', '', amount_str)
        amount_str = amount_str.replace(',', '.')
        
        try:
            return float(amount_str)
        except ValueError:
            return 0.0

    def normalize_date(self, date_str):
        """Нормализуем дату в формат YYYY-MM-DD"""
        if not date_str:
            return None
            
        # Если дата уже содержит название месяца
        for month_name, month_num in self.months.items():
            if month_name in date_str.lower():
                # Ищем день и год
                day_match = re.search(r'(\d{1,2})', date_str)
                year_match = re.search(r'(\d{4})', date_str)
                if day_match and year_match:
                    day = day_match.group(1).zfill(2)
                    year = year_match.group(1)
                    return f"{year}-{month_num}-{day}"
        
        # Убираем лишние символы для числовых дат
        date_str = re.sub(r'[^\d.]', '', date_str).strip()
        
        try:
            # Пробуем разные форматы
            for fmt in ['%d.%m.%Y', '%d.%m.%y', '%Y-%m-%d']:
                try:
                    date_obj = datetime.strptime(date_str, fmt)
                    return date_obj.strftime('%Y-%m-%d')
                except ValueError:
                    continue
        except Exception:
            pass
            
        return None

    def extract_items(self, text):
        """Извлекаем позиции счета"""
        items = []
        
        # Очищаем текст от лишних символов
        clean_text = re.sub(r'[|]', ' ', text)
        
        # Паттерны для поиска товарных позиций
        item_patterns = [
            # Паттерн 1: Номер Название Количество Ед Цена Сумма
            r'(\d+)\s+([^\d\n]+?)\s+(\d+(?:[.,]\d+)?)\s+(\w+)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)',
            # Паттерн 2: Для услуг и профилей
            r'(\d+)\s+(.*?(?:услуга|профиль|работа|материал).*?)\s+(\d+(?:[.,]\d+)?)\s*(\w*)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)',
            # Паттерн 3: Более общий для русского текста
            r'(\d+)\s+([\u0410-\u042f\u0430-\u044f\u0401\u0451\s\.,№\-/]+?)\s+(\d+(?:[.,]\d+)?)\s+(\w+)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)'
        ]
        
        lines = clean_text.split('\n')
        
        for line in lines:
            # Пропускаем заголовки и итоговые строки
            if any(word in line.lower() for word in ['итого', 'всего', 'товары', 'услуги', 'наименование', 'кол-во', 'цена', 'сумма']):
                continue
                
            for pattern in item_patterns:
                matches = re.findall(pattern, line, re.IGNORECASE)
                for match in matches:
                    if len(match) >= 6:
                        try:
                            # Очищаем название от лишних символов
                            name = re.sub(r'\s+', ' ', match[1]).strip()
                            if len(name) < 3:  # Пропускаем слишком короткие названия
                                continue
                                
                            quantity_str = match[2].replace(',', '.')
                            price_str = match[4].replace(',', '.')
                            total_str = match[5].replace(',', '.')
                            
                            # Удаляем пробелы из чисел
                            quantity_str = re.sub(r'\s', '', quantity_str)
                            price_str = re.sub(r'\s', '', price_str)
                            total_str = re.sub(r'\s', '', total_str)
                            
                            item = InvoiceItem(
                                position=int(match[0]),
                                name=name,
                                quantity=float(quantity_str) if quantity_str else 1.0,
                                unit=match[3].strip() if match[3].strip() else 'шт',
                                price=float(price_str) if price_str else 0.0,
                                total=float(total_str) if total_str else 0.0
                            )
                            
                            # Проверяем, что позиция не дублируется
                            if not any(existing.position == item.position for existing in items):
                                items.append(item)
                                
                        except (ValueError, IndexError) as e:
                            print(f"Ошибка парсинга позиции: {e}, строка: {line}")
                            continue
        
        return sorted(items, key=lambda x: x.position)

    def parse_invoice(self, text):
        """Основной метод парсинга счета"""
        print(f"Parsing text length: {len(text)} characters")
        
        # Извлекаем основные поля
        invoice_number = self.extract_field(text, 'invoice_number')
        invoice_date = self.extract_field(text, 'invoice_date')
        due_date = self.extract_field(text, 'due_date')
        
        # Контрагент
        contractor_name = self.extract_field(text, 'contractor_name')
        inn = self.extract_field(text, 'inn')
        kpp = self.extract_field(text, 'kpp')
        
        contractor = Contractor(
            name=contractor_name or "Неизвестный контрагент",
            inn=inn or "",
            kpp=kpp
        )
        
        # Суммы
        total_amount = self.normalize_amount(self.extract_field(text, 'total_amount'))
        vat_amount = self.normalize_amount(self.extract_field(text, 'vat_amount'))
        vat_rate_str = self.extract_field(text, 'vat_rate')
        vat_rate = float(vat_rate_str) if vat_rate_str else None
        
        # Позиции
        items = self.extract_items(text)
        
        print(f"Parsed: {invoice_number}, {invoice_date}, {contractor.name}, {total_amount}")
        print(f"VAT: {vat_amount}, Rate: {vat_rate}, Items: {len(items)}")
        
        return Invoice(
            number=invoice_number or "Не найден",
            date=self.normalize_date(invoice_date) or "",
            contractor=contractor,
            total_amount=total_amount,
            vat_amount=vat_amount if vat_amount > 0 else None,
            vat_rate=vat_rate,
            has_vat=vat_amount > 0 or "НДС" in text,
            due_date=self.normalize_date(due_date),
            items=items
        )

def main():
    parser = argparse.ArgumentParser(description='Enhanced Invoice Parser')
    parser.add_argument('--text', required=True, help='OCR text to parse')
    parser.add_argument('--output-format', choices=['json', 'detailed'], default='json')
    
    args = parser.parse_args()
    
    invoice_parser = EnhancedInvoiceParser()
    invoice = invoice_parser.parse_invoice(args.text)
    
    if args.output_format == 'json':
        # Преобразуем в словарь для JSON
        result = {
            "invoice": {
                "number": invoice.number,
                "date": invoice.date,
                "due_date": invoice.due_date,
                "total_amount": invoice.total_amount,
                "vat_amount": invoice.vat_amount,
                "vat_rate": invoice.vat_rate,
                "has_vat": invoice.has_vat
            },
            "contractor": {
                "name": invoice.contractor.name,
                "inn": invoice.contractor.inn,
                "kpp": invoice.contractor.kpp,
                "address": invoice.contractor.address
            },
            "items": [
                {
                    "position": item.position,
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "price": item.price,
                    "total": item.total
                }
                for item in (invoice.items or [])
            ]
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    else:
        # Детальный вывод
        print(f"\n=== АНАЛИЗ СЧЕТА ===")
        print(f"Номер: {invoice.number}")
        print(f"Дата: {invoice.date}")
        print(f"Срок оплаты: {invoice.due_date or 'Не указан'}")
        print(f"\n=== КОНТРАГЕНТ ===")
        print(f"Название: {invoice.contractor.name}")
        print(f"ИНН: {invoice.contractor.inn}")
        print(f"КПП: {invoice.contractor.kpp or 'Не указан'}")
        print(f"\n=== СУММЫ ===")
        print(f"Итого: {invoice.total_amount:.2f} руб.")
        print(f"НДС: {invoice.vat_amount:.2f} руб." if invoice.vat_amount else "НДС: Не включен")
        print(f"Ставка НДС: {invoice.vat_rate}%" if invoice.vat_rate else "")
        print(f"\n=== ПОЗИЦИИ ({len(invoice.items or [])}) ===")
        for item in (invoice.items or []):
            print(f"{item.position}. {item.name}")
            print(f"   {item.quantity} {item.unit} × {item.price:.2f} = {item.total:.2f} руб.")

if __name__ == "__main__":
    main()