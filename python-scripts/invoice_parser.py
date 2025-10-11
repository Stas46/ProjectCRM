#!/usr/bin/env python3
"""
Smart Invoice Parser
Интеллектуальный анализатор счетов с извлечением структурированных данных
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

class InvoiceParser:
    def __init__(self):
        # Паттерны для извлечения данных
        self.patterns = {
            'invoice_number': [
                r'[Сс]чет.*?№\s*(\d+(?:/\d+)?)',
                r'[Сс]чет.*?N\s*(\d+(?:/\d+)?)',
                r'№\s*(\d+(?:/\d+)?).*?от',
                r'Invoice.*?(?:№|N|#)\s*(\d+(?:/\d+)?)'
            ],
            'invoice_date': [
                r'от\s+(\d{1,2}[.\s]+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)[.\s]+\d{4})',
                r'от\s+(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
                r'date.*?(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
                r'(\d{1,2}[.\s]+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)[.\s]+\d{4})',
                r'(\d{1,2}[./]\d{1,2}[./]20\d{2})'
            ],
            'due_date': [
                r'[Оо]платить.*?не позднее\s+(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
                r'[Сс]рок.*?оплаты.*?(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
                r'[Дд]о\s+(\d{1,2}[./]\d{1,2}[./]\d{2,4})'
            ],
            'contractor_name': [
                r'(?:ООО|ИП|ОАО|ПАО|АО|ЗАО)\s+"?([^"]+)"?',
                r'[Пп]олучатель.*?([А-ЯЁ][А-ЯЁ\s".-]+)',
                r'[Пп]оставщик.*?([А-ЯЁ][А-ЯЁ\s".-]+)'
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
                r'[Вв]сего.*?к.*?оплате.*?(\d+(?:\s?\d{3})*[.,]\d{2})',
                r'[Ии]того.*?(\d+(?:\s?\d{3})*[.,]\d{2})',
                r'Total.*?(\d+(?:\s?\d{3})*[.,]\d{2})',
                r'(\d+(?:\s?\d{3})*[.,]\d{2}).*?руб'
            ],
            'vat_amount': [
                r'НДС.*?(\d+(?:\s?\d{3})*[.,]\d{2})',
                r'VAT.*?(\d+(?:\s?\d{3})*[.,]\d{2})',
                r'том числе НДС.*?(\d+(?:\s?\d{3})*[.,]\d{2})'
            ],
            'vat_rate': [
                r'НДС\s*(\d{1,2})%',
                r'VAT\s*(\d{1,2})%'
            ]
        }
        
        # Месяцы для парсинга дат
        self.months = {
            'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
            'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
            'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
        }

    def extract_field(self, text: str, field: str) -> Optional[str]:
        """Извлекает конкретное поле из текста"""
        if field not in self.patterns:
            return None
            
        for pattern in self.patterns[field]:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None

    def normalize_amount(self, amount_str: str) -> float:
        """Нормализует сумму в число"""
        if not amount_str:
            return 0.0
        
        # Убираем пробелы и заменяем запятую на точку
        normalized = re.sub(r'\s', '', amount_str).replace(',', '.')
        
        try:
            return float(normalized)
        except ValueError:
            return 0.0

    def normalize_date(self, date_str: str) -> Optional[str]:
        """Нормализует дату в формат YYYY-MM-DD"""
        if not date_str:
            return None
            
        # Пробуем разные форматы
        date_str = date_str.strip()
        
        # Формат с названием месяца
        for month_name, month_num in self.months.items():
            if month_name in date_str.lower():
                parts = re.findall(r'\d+', date_str)
                if len(parts) >= 3:
                    day = parts[0].zfill(2)
                    year = parts[-1]
                    if len(year) == 2:
                        year = '20' + year
                    return f"{year}-{month_num}-{day}"
        
        # Числовой формат
        parts = re.findall(r'\d+', date_str)
        if len(parts) >= 3:
            day, month, year = parts[0], parts[1], parts[2]
            if len(year) == 2:
                year = '20' + year
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        
        return None

    def extract_items(self, text: str) -> List[InvoiceItem]:
        """Извлекает позиции товаров/услуг из счета"""
        items = []
        
        # Ищем таблицу с товарами
        # Паттерн для строк таблицы
        table_pattern = r'(\d+)\s+([^0-9]+?)\s+(\d+(?:[.,]\d+)?)\s+([а-яА-Я\.]{1,10})\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)'
        
        matches = re.findall(table_pattern, text, re.MULTILINE)
        
        for match in matches:
            try:
                position = int(match[0])
                name = match[1].strip()
                quantity = self.normalize_amount(match[2])
                unit = match[3].strip()
                price = self.normalize_amount(match[4])
                total = self.normalize_amount(match[5])
                
                if quantity > 0 and price > 0:
                    items.append(InvoiceItem(
                        position=position,
                        name=name,
                        quantity=quantity,
                        unit=unit,
                        price=price,
                        total=total
                    ))
            except (ValueError, IndexError):
                continue
        
        return items

    def parse_invoice(self, text: str) -> Invoice:
        """Основной метод парсинга счета"""
        print("Starting invoice parsing...")
        
        # Извлечение основных полей
        invoice_number = self.extract_field(text, 'invoice_number')
        invoice_date = self.normalize_date(self.extract_field(text, 'invoice_date'))
        due_date = self.normalize_date(self.extract_field(text, 'due_date'))
        
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
        
        return Invoice(
            number=invoice_number or "Не найден",
            date=invoice_date or "",
            contractor=contractor,
            total_amount=total_amount,
            vat_amount=vat_amount if vat_amount > 0 else None,
            vat_rate=vat_rate,
            has_vat=vat_amount > 0 or "НДС" in text,
            due_date=due_date,
            items=items
        )

def main():
    parser = argparse.ArgumentParser(description='Smart Invoice Parser')
    parser.add_argument('--text', required=True, help='OCR text to parse')
    parser.add_argument('--output-format', choices=['json', 'detailed'], default='json')
    
    args = parser.parse_args()
    
    invoice_parser = InvoiceParser()
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