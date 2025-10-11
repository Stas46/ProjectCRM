#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from ultimate_invoice_parser import UltimateInvoiceParser
import json

def test_parser():
    parser = UltimateInvoiceParser(debug=True)
    
    # Тестовый текст
    test_text = """СЧЁТ № 36 от 04.11.2024

Получатель ООО АлРус Банк получателя

№ Наименование товара Кол-во Ед.изм. Цена Сумма
1 Профиль алюминиевый P-100 серебро 2.50 м 1200.00 3000.00
2 Стекло закаленное 6мм прозрачное 1 м² 2500.50 2500.50
3 Уплотнитель резиновый EPDM черный 10 м 150.75 1507.50
4 Фурнитура поворотно-откидная 1 компл 5000.00 5000.00
5 Петли дверные усиленные 2 шт 800.00 1600.00

Итого: 13608.00
НДС 20%: 2721.60
Всего к доплате: 16329.60"""
    
    print("=== ТЕСТ ПАРСЕРА ===")
    result = parser.parse_invoice(test_text)
    
    print(f"\n=== РЕЗУЛЬТАТЫ ===")
    print(f"Номер счета: {result['invoice']['number']}")
    print(f"Дата: {result['invoice']['date']}")
    print(f"Контрагент: {result['contractor']['name']}")
    print(f"Сумма: {result['invoice']['total_amount']}")
    print(f"НДС: {result['invoice']['vat_amount']} ({result['invoice']['vat_rate']}%)")
    print(f"Товаров найдено: {len(result.get('items', []))}")
    
    for i, item in enumerate(result.get('items', []), 1):
        print(f"  {i}. {item['name']}: {item['quantity']} {item['unit']} x {item['price']} = {item['total']}")

if __name__ == "__main__":
    test_parser()