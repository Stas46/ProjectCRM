#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Система настройки правил парсера
Позволяет изменять приоритеты и добавлять новые паттерны
"""

import json
import re
from typing import Dict, List, Any

class ParserRulesConfig:
    """Конфигурация правил парсера"""
    
    def __init__(self):
        self.invoice_number_patterns = [
            # Высокий приоритет - Буквенно-цифровые номера
            {
                "pattern": r'№\s*([А-ЯЁA-Z]+-\d+)',
                "priority": 1,
                "description": "Буквенно-цифровые номера (УТ-784, А-123)",
                "active": True
            },
            {
                "pattern": r'СЧЁТ.*?№\s*([А-ЯA-Z]+-\d+)',
                "priority": 1,
                "description": "СЧЁТ с буквенно-цифровым номером",
                "active": True
            },
            {
                "pattern": r'СЧЕТ.*?№\s*([А-ЯA-Z]+-\d+)',
                "priority": 1,
                "description": "СЧЕТ с буквенно-цифровым номером",
                "active": True
            },
            
            # Средний приоритет - Специальные форматы
            {
                "pattern": r'СЧЁТ[-\s]*ДОГОВОР.*?№\s*(\d+)',
                "priority": 2,
                "description": "СЧЁТ-ДОГОВОР с номером",
                "active": True
            },
            {
                "pattern": r'СЧЕТ[-\s]*ДОГОВОР.*?№\s*(\d+)',
                "priority": 2,
                "description": "СЧЕТ-ДОГОВОР с номером",
                "active": True
            },
            {
                "pattern": r'№\s*(0+\d+)\s*от',
                "priority": 2,
                "description": "Номер с нулями в начале",
                "active": True
            },
            
            # Низкий приоритет - Обычные номера
            {
                "pattern": r'СЧЁТ.*?№\s*(\d+)',
                "priority": 3,
                "description": "СЧЁТ с номером",
                "active": True
            },
            {
                "pattern": r'СЧЕТ.*?№\s*(\d+)',
                "priority": 3,
                "description": "СЧЕТ с номером",
                "active": True
            },
            {
                "pattern": r'№\s*(\d+)\s*от\s*\d',
                "priority": 3,
                "description": "№ НОМЕР от ДАТА",
                "active": True
            },
            
            # Очень низкий приоритет
            {
                "pattern": r'С[ЧТ]\s+(\d+)\s+от',
                "priority": 4,
                "description": "OCR искажения СЧ->СТ",
                "active": True
            },
            {
                "pattern": r'№\s*(\d{2,10})\s*от',
                "priority": 4,
                "description": "Универсальный номер в начале",
                "active": True
            }
        ]
        
        self.total_amount_patterns = [
            # Высокий приоритет
            {
                "pattern": r'(?:всего\s*к\s*оплате|ВСЕГО\s*К\s*ОПЛАТЕ)[\s:]*([0-9]{1,3}(?:[\s,\.][0-9]{3})*[\.,]\d{2})',
                "priority": 1,
                "description": "Всего к оплате",
                "active": True
            },
            {
                "pattern": r'(?:Итого|ИТОГО|Total)[\s:]*([0-9]{1,3}(?:[\s,\.][0-9]{3})*[\.,]\d{2})',
                "priority": 1,
                "description": "Итого с двоеточием",
                "active": True
            },
            {
                "pattern": r'(?:к\s*доплате|К\s*ДОПЛАТЕ)[\s:]*([0-9]{1,3}(?:[\s,\.][0-9]{3})*[\.,]\d{2})',
                "priority": 1,
                "description": "К доплате",
                "active": True
            },
            {
                "pattern": r'(?:Всего|ВСЕГО)[\s:]*([0-9]{1,3}(?:[\s,\.][0-9]{3})*[\.,]\d{2})',
                "priority": 1,
                "description": "Общий итог",
                "active": True
            },
            {
                "pattern": r'(?:общая\s*стоимость|ОБЩАЯ\s*СТОИМОСТЬ)[\s:]*([0-9]{1,3}(?:[\s,\.][0-9]{3})*[\.,]\d{2})',
                "priority": 1,
                "description": "Общая стоимость",
                "active": True
            },
            
            # Средний приоритет
            {
                "pattern": r'([0-9]{4,}[\.,]\d{2})\s*руб',
                "priority": 2,
                "description": "Суммы с 'руб' (только большие)",
                "active": True
            },
            
            # Низкий приоритет
            {
                "pattern": r'([0-9]{6,}[\.,]\d{2})',
                "priority": 3,
                "description": "Очень большие числа (6+ цифр)",
                "active": True
            }
        ]
        
        self.contractor_name_patterns = [
            # Высокий приоритет
            {
                "pattern": r'Поставщик:\s*([^\n\r,]+?)(?:,|\s*ИНН|\s*КПП|\s*Адрес:|\s*тел\.|\s*$)',
                "priority": 1,
                "description": "Поставщик: НАЗВАНИЕ",
                "active": True
            },
            {
                "pattern": r'(?:^|[\s\n])(?:\d+\/\d+\s+)?ООО\s*"?Группа компаний\s*"?([^"\n\r]*?)"?(?:\s|$)',
                "priority": 1,
                "description": "ООО 'Группа компаний'",
                "active": True
            },
            {
                "pattern": r'Получатель[\s\S]*?(?:ООО|ИП|ЗАО|ПАО|АО)\s*"?([^"\n\r]+?)"?\s*(?:Сч\.|ИНН|\s)',
                "priority": 1,
                "description": "Получатель в банковских реквизитах",
                "active": True
            },
            
            # Средний приоритет
            {
                "pattern": r'(ООО|ИП|ЗАО|ПАО|АО)\s*"?([^"\n\r,]+?)(?:",|\s*ИНН|\s*КПП|\s*Сч\.|\s|$)',
                "priority": 2,
                "description": "Первая найденная компания",
                "active": True
            }
        ]
        
        self.inn_patterns = [
            # Высокий приоритет
            {
                "pattern": r'Поставщик[\s\S]*?ИНН\s*(\d{10,12})',
                "priority": 1,
                "description": "ИНН в секции поставщика",
                "active": True
            },
            {
                "pattern": r'(\d{10,12})\/\d+\s+ООО\s*"?Группа компаний',
                "priority": 1,
                "description": "ИНН/КПП ПЕРЕД Группа компаний",
                "active": True
            },
            {
                "pattern": r'ООО\s*"?Группа компаний[\s\S]*?ИНН[\s:]*(\d{10,12})',
                "priority": 1,
                "description": "ИНН ПОСЛЕ Группа компаний",
                "active": True
            },
            
            # Средний приоритет
            {
                "pattern": r'ИНН[\s:]*(\d{10,12})',
                "priority": 2,
                "description": "Любой ИНН (исключая заказчика)",
                "active": True
            },
            {
                "pattern": r'Получатель[\s\S]*?ИНН[\s:]*(\d{10,12})',
                "priority": 2,
                "description": "ИНН в банковских реквизитах",
                "active": True
            }
        ]
        
        self.settings = {
            "min_invoice_amount": 100,
            "exclude_inn_from_customer": True,
            "debug_mode": False,
            "russian_months": {
                'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
                'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
                'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
            }
        }
    
    def save_to_file(self, filename: str):
        """Сохранить конфигурацию в файл"""
        config = {
            "invoice_number_patterns": self.invoice_number_patterns,
            "total_amount_patterns": self.total_amount_patterns,
            "contractor_name_patterns": self.contractor_name_patterns,
            "inn_patterns": self.inn_patterns,
            "settings": self.settings
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    
    def load_from_file(self, filename: str):
        """Загрузить конфигурацию из файла"""
        with open(filename, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        self.invoice_number_patterns = config.get("invoice_number_patterns", [])
        self.total_amount_patterns = config.get("total_amount_patterns", [])
        self.contractor_name_patterns = config.get("contractor_name_patterns", [])
        self.inn_patterns = config.get("inn_patterns", [])
        self.settings = config.get("settings", {})
    
    def add_pattern(self, pattern_type: str, pattern: str, priority: int, description: str):
        """Добавить новый паттерн"""
        new_pattern = {
            "pattern": pattern,
            "priority": priority,
            "description": description,
            "active": True
        }
        
        pattern_list = getattr(self, f"{pattern_type}_patterns", None)
        if pattern_list is not None:
            pattern_list.append(new_pattern)
            # Сортируем по приоритету
            pattern_list.sort(key=lambda x: x["priority"])
    
    def disable_pattern(self, pattern_type: str, pattern_index: int):
        """Отключить паттерн"""
        pattern_list = getattr(self, f"{pattern_type}_patterns", None)
        if pattern_list and 0 <= pattern_index < len(pattern_list):
            pattern_list[pattern_index]["active"] = False
    
    def get_active_patterns(self, pattern_type: str) -> List[str]:
        """Получить список активных паттернов"""
        pattern_list = getattr(self, f"{pattern_type}_patterns", [])
        active = [p for p in pattern_list if p.get("active", True)]
        # Сортируем по приоритету
        active.sort(key=lambda x: x.get("priority", 999))
        return [p["pattern"] for p in active]
    
    def print_rules(self):
        """Вывести все правила в читаемом виде"""
        print("=== ПРАВИЛА ПАРСЕРА СЧЕТОВ ===\n")
        
        print("1. ИЗВЛЕЧЕНИЕ НОМЕРА СЧЕТА:")
        for i, pattern in enumerate(self.invoice_number_patterns):
            status = "✓" if pattern.get("active", True) else "✗"
            print(f"  {i+1}. [{status}] {pattern['description']} (приоритет: {pattern['priority']})")
            print(f"      Паттерн: {pattern['pattern']}")
        
        print("\n2. ИЗВЛЕЧЕНИЕ СУММЫ СЧЕТА:")
        for i, pattern in enumerate(self.total_amount_patterns):
            status = "✓" if pattern.get("active", True) else "✗"
            print(f"  {i+1}. [{status}] {pattern['description']} (приоритет: {pattern['priority']})")
            print(f"      Паттерн: {pattern['pattern']}")
        
        print("\n3. ИЗВЛЕЧЕНИЕ НАЗВАНИЯ ПОСТАВЩИКА:")
        for i, pattern in enumerate(self.contractor_name_patterns):
            status = "✓" if pattern.get("active", True) else "✗"
            print(f"  {i+1}. [{status}] {pattern['description']} (приоритет: {pattern['priority']})")
            print(f"      Паттерн: {pattern['pattern']}")
        
        print("\n4. ИЗВЛЕЧЕНИЕ ИНН ПОСТАВЩИКА:")
        for i, pattern in enumerate(self.inn_patterns):
            status = "✓" if pattern.get("active", True) else "✗"
            print(f"  {i+1}. [{status}] {pattern['description']} (приоритет: {pattern['priority']})")
            print(f"      Паттерн: {pattern['pattern']}")
        
        print(f"\n5. НАСТРОЙКИ:")
        print(f"  - Минимальная сумма счёта: {self.settings.get('min_invoice_amount', 100)} руб.")
        print(f"  - Исключать ИНН заказчика: {self.settings.get('exclude_inn_from_customer', True)}")
        print(f"  - Режим отладки: {self.settings.get('debug_mode', False)}")

def main():
    """Пример использования"""
    config = ParserRulesConfig()
    
    # Выводим текущие правила
    config.print_rules()
    
    # Сохраняем в файл
    config.save_to_file("parser_rules.json")
    print("\n✅ Правила сохранены в parser_rules.json")
    
    # Пример добавления нового паттерна
    config.add_pattern(
        "invoice_number", 
        r'Инвойс\s*№\s*([А-Я\d\-]+)', 
        1, 
        "Инвойс с номером"
    )
    
    print("\n📝 Добавлен новый паттерн для номера счета")
    config.save_to_file("parser_rules_updated.json")

if __name__ == "__main__":
    main()