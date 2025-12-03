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
            # ПЕТРОВИЧ И ДРУГИЕ: Буквенно-цифровые номера БЕЗ дефиса (СЭ00846838, ТВЭ01037849) - НАИВЫСШИЙ ПРИОРИТЕТ!
            r'(?:Счёт|Счет|СЧЁТ|СЧЕТ)\s*([А-ЯЁA-Z]{1,4}\d{6,12})',  # Счёт СЭ00846838
            r'(?:Заказ|ЗАКАЗ).*?№\s*([А-ЯЁA-Z]{1,4}\d{6,12})',  # Заказ покупателя № ТВЭ01037849
            r'№\s*([А-ЯЁA-Z]{1,4}\d{6,12})\s*от',  # № СЭ00846838 от
            
            # СПЕЦИФИКАЦИЯ (АЛЮТЕХ и др.) - ОЧЕНЬ ВЫСОКИЙ ПРИОРИТЕТ!
            r'СПЕЦИФИКАЦИЯ\s*№\s*(\d+)',
            r'Спецификация\s*№\s*(\d+)',
            
            # Буквенно-цифровые номера С ДЕФИСОМ (УТ-784, А-123, и т.д.) - ВЫСОКИЙ ПРИОРИТЕТ!
            r'№\s*([А-ЯЁA-Z]+-\d+)',  
            r'№\s*([ABCDEFGHIJKLMNOPQRSTUVWXYZАВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ]+-\d+)',
            r'СЧЁТ.*?№\s*([А-ЯA-Z]+-\d+)',
            r'СЧЕТ.*?№\s*([А-ЯA-Z]+-\d+)',
            r'С[ЧТ].*?№\s*([А-ЯA-Z]+-\d+)',
            r'счёт.*?№\s*([А-ЯA-Z]+-\d+)',
            r'счет.*?№\s*([А-ЯA-Z]+-\d+)',

            # КРИТИЧНЫЙ ПРИОРИТЕТ: Короткие номера 1-6 цифр (должны быть ПЕРЕД длинными!)
            # Специальный формат "Счет и Бух-НОМЕР" (из OCR)
            r'Счет\s+и\s+Бух[-\s]*(\d+)',
            r'СЧЕТ\s+И\s+БУХ[-\s]*(\d+)',
            
            # Паттерны с "от" в той же строке
            r'СЧЁТ\s*№\s*(\d{1,6})\s*от',
            r'СЧЕТ\s*№\s*(\d{1,6})\s*от',
            r'С[ЧТ]\s*№\s*(\d{1,6})\s*от',
            r'счёт\s*№\s*(\d{1,6})\s*от',
            r'счет\s*№\s*(\d{1,6})\s*от',
            # Паттерны БЕЗ "от" - только если после номера НЕ идут 4+ цифр подряд (не БИК/счет)
            r'СЧЁТ\s*№\s*(\d{1,6})(?!\d)',
            r'СЧЕТ\s*№\s*(\d{1,6})(?!\d)',
            r'С[ЧТ]\s*№\s*(\d{1,6})(?!\d)',

            # Счет-договор с номером (из логов: № 22980)
            r'СЧЁТ[-\s]*ДОГОВОР.*?№\s*(\d+)',
            r'СЧЕТ[-\s]*ДОГОВОР.*?№\s*(\d+)',

            # Номер с нулями в начале (из логов: 00000007898, 00000007883) - НИЗКИЙ ПРИОРИТЕТ
            r'№\s*(0{4,}\d+)\s*от',  # Минимум 4 нуля в начале
            r'СЧЁТ.*?№\s*(0{4,}\d+)',
            r'СЧЕТ.*?№\s*(0{4,}\d+)',
            r'С[ЧТ].*?№\s*(0{4,}\d+)',

            # Обычный счет (НИЗКИЙ ПРИОРИТЕТ - могут ловить БИК)
            r'СЧЁТ.*?№\s*(\d+)',
            r'СЧЕТ.*?№\s*(\d+)',
            r'С[ЧТ].*?№\s*(\d+)',    # OCR искажения
            r'счёт.*?№\s*(\d+)',
            r'счет.*?№\s*(\d+)',
            r'№\s*(\d+)\s*от\s*\d',
            r'Invoice.*?№\s*(\d+)',

            # Универсальные паттерны (с учетом потери символов при OCR/консоли)
            r'С[ЧТ]\s+(\d+)\s+от',  # "СТ 00000007883 от"
            r'С[ЧТ].*?(\d{5,})',     # "СТ" + длинное число

            # Номер в начале документа (расширенный диапазон) - ПОСЛЕДНИЙ ПРИОРИТЕТ
            r'№\s*(\d{2,10})\s*от',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                number = match.group(1).strip()

                # Исключаем банковские расчётные счета (ровно 20 цифр, начинаются с 407, 408 и т.д.)
                if number.isdigit() and len(number) == 20:
                    # Расчётные счета обычно начинаются с 407, 408, 406, 403, 301, 302 и т.д.
                    # Это НЕ номер счёта-фактуры, пропускаем
                    if self.debug:
                        print(f"Пропускаем банковский счёт: {number}")
                    continue

                # Исключаем ИНН (обычно 10 или 12 цифр)
                if number.isdigit() and len(number) in [10, 12]:
                    # Проверяем, что это не ИНН
                    if re.search(rf'ИНН\s*{re.escape(number)}', text, re.IGNORECASE):
                        continue
                
                # Исключаем БИК (9 цифр, обычно начинается с 04)
                if number.isdigit() and len(number) == 9 and number.startswith('04'):
                    # Проверяем контекст - если рядом "БИК" или "Банк"
                    if re.search(rf'(?:БИК|Банк|БАНК|К/С|Кор).*?{re.escape(number)}', text, re.IGNORECASE):
                        continue
                    # Или если БИК упоминается в том же блоке
                    context = text[max(0, text.find(number) - 100):text.find(number) + 100]
                    if re.search(r'БИК|Банк|К/С|Кор', context, re.IGNORECASE):
                        continue

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
        
        # ИНН покупателя для исключения (Ткачев С.О.)
        buyer_inn = '784802613697'
        buyer_patterns = ['ткачев', 'tkachev', buyer_inn]

        # 1. ВЫСШИЙ ПРИОРИТЕТ: Прямое указание "Поставщик:" в начале строки
        # Формат: "Поставщик: Акционерное Общество "Балтийское Стекло", ИНН 7801514385"
        direct_supplier_patterns = [
            # АО/ОАО/ЗАО/ПАО с кавычками
            r'Поставщик:\s*((?:Акционерное\s+Общество|АО|ОАО|ЗАО|ПАО)\s*["""«]([^"""»\n]{3,60})["""»])',
            # ООО с кавычками
            r'Поставщик:\s*(ООО\s*["""«]([^"""»\n]{3,60})["""»])',
            # Любая орг. форма + название до запятой/ИНН
            r'Поставщик:\s*((?:АО|ОАО|ЗАО|ПАО|ООО)\s*["""«]?[^,\n]{3,60}?)(?:,\s*ИНН|\s+ИНН)',
            # Акционерное Общество полностью
            r'Поставщик:\s*(Акционерное\s+Общество\s*["""«]?[^,\n]{3,60}?)(?:,|\s+ИНН)',
        ]
        
        for pattern in direct_supplier_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                company_name = match.group(1).strip()
                
                # Проверяем, что это НЕ покупатель
                if any(buyer in company_name.lower() for buyer in buyer_patterns):
                    continue
                
                # Очистка
                company_name = re.sub(r'\s+', ' ', company_name)
                company_name = re.sub(r',?\s*КПП.*$', '', company_name, flags=re.IGNORECASE)
                company_name = company_name.strip('"«»""')
                
                # Нормализация АО
                if company_name.lower().startswith('акционерное общество'):
                    name_part = re.sub(r'^акционерное\s+общество\s*', '', company_name, flags=re.IGNORECASE).strip('"«»"" ')
                    company_name = f'АО "{name_part}"'
                elif company_name.startswith('АО ') and '"' not in company_name:
                    name_part = company_name[3:].strip()
                    company_name = f'АО "{name_part}"'
                
                if len(company_name) >= 5:
                    if self.debug:
                        print(f"Найдено название поставщика (прямое указание): '{company_name}'")
                    return company_name

        # 2. Приоритетные известные компании (точные совпадения из логов)
        known_companies = [
            r'Балтийское\s+Стекло',  # Добавлено!
            r'МЕТАЛЛМАСТЕР-М',
            r'АлРус',
            r'Эксперт\s+Рентал\s+Инжиниринг',
            r'ксперт\s+ентал\s+нжиниринг',  # OCR часто пропускает первые буквы
            r'Петрович',
            r'ОЗЕРОВ\s+МАКСИМ\s+НИКОЛАЕВИЧ',
            r'ООО\s*["""«]?Спецмаш["""»]?',
            r'Спецмаш',
        ]

        for pattern in known_companies:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                company_name = match.group().strip()

                # Нормализация названий
                if 'балтийское' in company_name.lower() and 'стекло' in company_name.lower():
                    company_name = 'АО "Балтийское Стекло"'
                elif 'ксперт' in company_name.lower():
                    company_name = "Эксперт Рентал Инжиниринг"
                elif 'спецмаш' in company_name.lower() and not company_name.startswith('ООО'):
                    company_name = 'ООО "Спецмаш"'

                if self.debug:
                    print(f"Найдено название: '{company_name}'")
                return company_name

        # 3. КРИТИЧНО ДЛЯ EXCEL: Ищем поставщика в строке с "Получатель:" (это ПРОДАВЕЦ!)
        # В вашем формате счетов:
        # Получатель: ООО "Группа компаний "СтиС"" - это ПОСТАВЩИК (продавец)
        # Заказчик: ИП Ткачев С.О. - это ПОКУПАТЕЛЬ (вы)
        excel_supplier_patterns = [
            # Получатель - это поставщик в данном формате
            r'Получатель[:\s]*\n?\s*(\d+/\d+)\s+((?:ООО|ИП|АО|ЗАО)[^,\n]{3,80})',  # С номером счета
            r'Получатель[:\s]*\n?\s*((?:ООО|ИП|АО|ЗАО)\s+["""«]?[^"""»\n]{3,60}["""»]?)',
            
            # Продавец/Поставщик с организационной формой
            r'(?:Продавец|Поставщик):\s*(ООО|ИП|АО|ЗАО)\s*["""«]?([^"""»\n,]{3,50})["""»]?(?:,|\s*ИНН)',
            r'(?:Продавец|Поставщик):\s*([^\n,]+?)(?:,\s*ИНН|\s+ИНН)',
        ]
        
        for pattern in excel_supplier_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                if len(match.groups()) == 2 and match.group(1) and '/' in match.group(1):
                    # Формат с номером счета: пропускаем номер, берем название
                    company_name = match.group(2).strip()
                elif len(match.groups()) == 2:  # ООО + название
                    org_type = match.group(1)
                    company_name = match.group(2).strip()
                    company_name = f'{org_type} "{company_name}"' if not company_name.startswith('"') else f'{org_type} {company_name}'
                else:  # полное название
                    company_name = match.group(1).strip()
                
                # Очистка от номеров счетов и банковских реквизитов
                company_name = re.sub(r'\s+', ' ', company_name)
                company_name = re.sub(r',?\s*тел\..*$', '', company_name, flags=re.IGNORECASE)  # Убираем ", тел."
                company_name = re.sub(r'\s+Сч\.?\s*№?\s*\d+.*$', '', company_name, flags=re.IGNORECASE)  # Убираем "Сч. № 123456..."
                company_name = re.sub(r'\s+БИК.*$', '', company_name, flags=re.IGNORECASE)  # Убираем "БИК..."
                company_name = re.sub(r'\s+Банк.*$', '', company_name, flags=re.IGNORECASE)  # Убираем "Банк..."
                company_name = company_name.strip('"«»""')
                
                # Исключаем покупателя (вас)
                if any(buyer in company_name.lower() for buyer in buyer_patterns):
                    continue
                
                if len(company_name) >= 5:
                    # Добавляем кавычки если их нет и это ООО
                    if company_name.startswith('ООО ') and '"' not in company_name and '«' not in company_name:
                        name_part = company_name[4:]
                        company_name = f'ООО "{name_part}"'
                    
                    if self.debug:
                        print(f"Найдено название поставщика (Excel формат): '{company_name}'")
                    return company_name

        # 4. Ищем в строках с "Получатель", "Продавец", "Поставщик" - избегаем фрагментов про самовывоз
        supplier_context_patterns = [
            r'(?:Получатель|Продавец|Поставщик)[\s:]*\n?\s*((?:ООО|ИП|АО|ЗАО|ПАО)\s*["""«]?[^"""»\n]{3,50}["""»]?)',
            r'(?:Получатель|Продавец|Поставщик)[^\n]{0,200}?((?:ООО|ИП|АО)\s*["""«][^"""»\n]{3,50}["""»])',
        ]
        
        for pattern in supplier_context_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE | re.DOTALL)
            if match:
                company_name = match.group(1).strip()
                
                # Исключаем покупателя
                if any(buyer in company_name.lower() for buyer in buyer_patterns):
                    continue
                
                # Очистка
                company_name = re.sub(r'\s+', ' ', company_name)
                company_name = re.sub(r'\s*(?:ИНН|БИК|КПП).*$', '', company_name, flags=re.IGNORECASE)
                company_name = company_name.strip('"«»""')
                
                # Исключаем неподходящие фрагменты
                if (len(company_name) >= 5 and
                    'самовывоз' not in company_name.lower() and
                    'доверенности' not in company_name.lower() and
                    'паспорта' not in company_name.lower()):
                    if self.debug:
                        print(f"Найдено название поставщика (с контекстом): '{company_name}'")
                    return company_name

        # 5. ООО в кавычках по всему тексту
        patterns = [
            # ООО с вложенными кавычками - жадный захват до последней кавычки
            r'ООО\s*"(.*)"',
            r'ООО\s*["""«]([^"""»\n,]{3,40})["""»]',
            r'000\s*["""«]([^"""»\n,]{3,40})["""»]',  # частая опечатка

            # ИП - продавец (с ФИО)
            r'(?:ИП|Индивидуальный предприниматель)\s+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)',

            # Поставщик с двоеточием
            r'Поставщик:\s*([А-ЯЁа-яё\s\-"«»]{3,50})(?:,|\s*ИНН|\n)',
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE | re.UNICODE)
            for match in matches:
                company_name = match.group(1).strip().strip('"«»""')

                # Очистка и валидация
                company_name = re.sub(r'\s+', ' ', company_name)  # Нормализуем пробелы
                company_name = re.sub(r'\s*(?:ИНН|БИК|КПП).*$', '', company_name, flags=re.IGNORECASE)

                # Исключаем неподходящие фрагменты
                if (len(company_name) >= 3 and
                    not company_name.isdigit() and
                    'самовывоз' not in company_name.lower() and
                    'при наличии' not in company_name.lower() and
                    'доверенности' not in company_name.lower() and
                    not re.match(r'^(Банк|Счет|Дата|руб|город)$', company_name, re.IGNORECASE)):

                    # Добавляем префикс ООО/ИП если его нет
                    if not re.match(r'^(ООО|ИП|АО|ЗАО|ПАО)', company_name, re.IGNORECASE):
                        if 'ИП' in text or 'Индивидуальный предприниматель' in text:
                            company_name = f'ИП {company_name}'
                        else:
                            # Проверяем, есть ли уже кавычки
                            if company_name.startswith('"') and company_name.endswith('"'):
                                company_name = f'ООО {company_name}'
                            elif company_name.startswith('"'):
                                company_name = f'ООО {company_name}"'
                            elif company_name.endswith('"'):
                                company_name = f'ООО "{company_name}'
                            else:
                                company_name = f'ООО "{company_name}"'
                    elif company_name.startswith('ООО ') and not ('"' in company_name or '«' in company_name):
                        # Если ООО есть, но нет кавычек - добавляем
                        name_part = company_name[4:]  # Убираем "ООО "
                        company_name = f'ООО "{name_part}"'
                    
                    if self.debug:
                        print(f"Найдено название: '{company_name}'")
                    return company_name

        return None

    def extract_inn(self, text: str) -> Optional[list]:
        """Извлекает ИНН поставщика и покупателя (приоритет поставщику)"""
        
        # ИСКЛЮЧАЕМ ИНН Ткачева (это покупатель, а не поставщик!)
        buyer_inn = '784802613697'
        
        supplier_inn = None
        
        # ПРИОРИТЕТ 0 (ВЫСШИЙ): ИНН в строке "Поставщик:" 
        # Формат: "Поставщик: Акционерное Общество "Балтийское Стекло", ИНН 7801514385"
        direct_postavschik_patterns = [
            r'Поставщик:[^\n]*?ИНН[:\s]*(\d{10,12})',
            r'Поставщик:[^\n]*?(\d{10})\s*/\s*\d{9}',  # ИНН/КПП
        ]
        
        for pattern in direct_postavschik_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                found_inn = match.group(1)
                if found_inn != buyer_inn and len(found_inn) in [10, 12]:
                    supplier_inn = found_inn
                    if self.debug:
                        print(f"Найден ИНН поставщика (строка Поставщик): {supplier_inn}")
                    break
        
        # ПРИОРИТЕТ 1: ИНН из строки "Получатель:" (это поставщик в некоторых форматах счетов!)
        if not supplier_inn:
            receiver_patterns = [
                r'Получатель[:\s]*\n?\s*(\d{10,12})',  # ИНН сразу после "Получатель"
                r'Получатель[^\n]{0,100}?ИНН[:\s]*(\d{10,12})',
            ]
            
            for pattern in receiver_patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    found_inn = match.group(1)
                    if found_inn != buyer_inn and len(found_inn) in [10, 12]:
                        supplier_inn = found_inn
                        if self.debug:
                            print(f"Найден ИНН поставщика (Получатель): {supplier_inn}")
                        break
        
        # ПРИОРИТЕТ 2: ИНН СРАЗУ после "Продавец:" в той же строке
        if not supplier_inn:
            direct_supplier_patterns = [
                r'(?:Продавец):[^\n]{0,100}?ИНН[:\s]*(\d{10,12})',
            ]
            
            for pattern in direct_supplier_patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    found_inn = match.group(1)
                    if found_inn != buyer_inn:
                        supplier_inn = found_inn
                        if self.debug:
                            print(f"Найден ИНН поставщика (прямое указание): {supplier_inn}")
                        break
        
        # ПРИОРИТЕТ 3: ИНН в контексте "Продавец", "Поставщик" (НЕ "Заказчик"!)
        if not supplier_inn:
            supplier_context_patterns = [
                r'(?:Продавец|Поставщик)[^\n]{0,200}?ИНН[:\s]*(\d{10,12})',
                r'ИНН[:\s]*(\d{10,12})[^\n]{0,100}?(?:Продавец|Поставщик)',
            ]
            
            for pattern in supplier_context_patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                if match:
                    found_inn = match.group(1)
                    if found_inn != buyer_inn:
                        supplier_inn = found_inn
                        if self.debug:
                            print(f"Найден ИНН поставщика (с контекстом): {supplier_inn}")
                        break
        
        # ПРИОРИТЕТ 4: Все ИНН в документе (но исключаем ИНН покупателя!)
        inn_patterns = [
            r'ИНН[:\s]*(\d{10,12})',
            r'ИНН\s+(\d{10,12})',
            r'(\d{10})\s*/\s*\d{9}',  # ИНН/КПП формат
            r'(\d{12})\s*(?:ИП|Индивидуальный предприниматель)',
        ]

        found_inns = []
        for pattern in inn_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                if len(match) in [10, 12]:  # Валидная длина ИНН
                    found_inns.append(match)

        # Убираем дубликаты, сохраняя порядок
        seen = set()
        unique_inns = []
        for inn in found_inns:
            if inn not in seen:
                seen.add(inn)
                unique_inns.append(inn)
        
        # Если нашли ИНН поставщика - ставим его первым
        if supplier_inn and supplier_inn in unique_inns:
            unique_inns.remove(supplier_inn)
            unique_inns.insert(0, supplier_inn)
        elif supplier_inn:
            unique_inns.insert(0, supplier_inn)
        
        result = unique_inns if unique_inns else None
        if self.debug and result:
            print(f"Все найденные ИНН: {result} (первый - поставщик)")
        return result

    def extract_total_amount(self, text: str) -> Optional[float]:
        """Извлекает общую сумму"""
        # Сначала найдем все ИНН и БИК в тексте, чтобы исключить их
        inn_patterns = [
            r'ИНН[\s:]*(\d{10,12})',
            r'инн[\s:]*(\d{10,12})',
            r'И\.Н\.Н\.[\s:]*(\d{10,12})',
        ]

        # Паттерны для БИК (всегда 9 цифр)
        bik_patterns = [
            r'БИК[\s:]*(\d{9})',
            r'бик[\s:]*(\d{9})',
            r'Б\.И\.К\.[\s:]*(\d{9})',
        ]

        # Паттерны для номеров счетов (обычно 20 цифр)
        account_patterns = [
            r'Сч\.?\s*№?\s*(\d{20})',
            r'сч\.?\s*№?\s*(\d{20})',
            r'счет[\s№]*(\d{20})',
            r'р/с[\s:]*(\d{20})',
        ]

        excluded_numbers = set()

        # Собираем все ИНН
        for pattern in inn_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                excluded_numbers.add(match)

        # Собираем все БИК
        for pattern in bik_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                excluded_numbers.add(match)

        # Собираем номера счетов
        for pattern in account_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                excluded_numbers.add(match)

        if self.debug:
            print(f"Исключаемые числа (ИНН, БИК, счета): {excluded_numbers}")

        patterns = [
            # ПРИОРИТЕТ 1: "Всего наименований ... на сумму ... RUB/руб"
            r'Всего\s+наименований\s+\d+,?\s*на\s+сумму[\s:]*(\d+(?:[\.,]\d{1,2})?)\s*(?:RUB|руб)',
            
            # ПРИОРИТЕТ 2: Всего к оплате (Excel формат: 19034.7 или OCR формат: 19 034,70)
            r'(?:всего\s*к\s*оплате|к\s*оплате)[\s:|]*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 3: Итого с НДС
            r'(?:итого\s*с\s*ндс)[\s:|]*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 4: Итого (любой регистр, с символом |)
            r'(?:итого|ИТОГО|Total)[\s:|]*\|?\s*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 5: Всего ... руб (с контекстом)
            r'(?:всего|ВСЕГО)[\s\w]*?(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)[\s]*руб',
            
            # ПРИОРИТЕТ 6: "на сумму ... руб"
            r'на\s+сумму[\s:]*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)\s*руб',
            
            # ПРИОРИТЕТ 7: К доплате
            r'(?:к\s*доплате)[\s:|]*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 8: Общая стоимость
            r'(?:общая\s*стоимость)[\s:|]*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 9: Сумма к доплате с НДС
            r'(?:сумма\s*к\s*доплате\s*с\s*ндс)[\s:|]*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
        ]
        
        # Проверяем наличие ключевых слов для итоговой суммы
        has_total_keywords = bool(re.search(r'итого|всего|к\s*оплате|total|сумма', text, re.IGNORECASE))

        for i, pattern in enumerate(patterns):
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            if matches:
                # Берем первое найденное совпадение (приоритет по порядку паттернов)
                amount_str = matches[0] if isinstance(matches[0], str) else matches[0]
                try:
                    # Специальная обработка формата с дефисом (например, 168897-22)
                    if '-' in amount_str and re.match(r'^\d+-\d{2}$', amount_str):
                        # Заменяем дефис на точку для правильного формата
                        amount_clean = amount_str.replace('-', '.')
                    else:
                        # Очищаем и конвертируем сумму
                        amount_clean = amount_str.replace(' ', '').replace(',', '.')
                        # Убираем лишние символы
                        amount_clean = re.sub(r'[^\d\.]', '', amount_clean)

                    amount = float(amount_clean)

                    # Исключаем ИНН, БИК и номера счетов
                    amount_as_str = str(int(amount))
                    if amount_as_str in excluded_numbers:
                        if self.debug:
                            print(f"Исключаем сумму {amount} как ИНН/БИК/счет")
                        continue

                    # Проверяем длину числа (ИНН обычно 10-12 цифр)
                    # НО только если число целое без копеек (т.е. точно НЕ сумма)
                    if len(amount_as_str) in [10, 11, 12] and amount == int(amount):
                        if self.debug:
                            print(f"Исключаем сумму {amount} как возможный ИНН по длине")
                        continue
                    
                    # Дополнительная проверка: если число больше 1 000 000 000 (миллиард),
                    # это скорее всего номер счета или ИНН, а не сумма
                    if amount > 1_000_000_000:
                        if self.debug:
                            print(f"Исключаем сумму {amount} как слишком большую (вероятно счет/ИНН)")
                        continue

                    if amount > 100:  # Минимальная разумная сумма счета
                        if self.debug:
                            print(f"Найдена сумма: {amount}")
                        return amount
                except ValueError:
                    continue

        # Если не нашли сумму и нет ключевых слов "Итого/Всего", возвращаем None
        if not has_total_keywords:
            if self.debug:
                print(f"Не найдена сумма и нет ключевых слов 'Итого/Всего/К оплате' - возвращаем None")
        
        return None

    def extract_vat_info(self, text: str) -> tuple[Optional[float], Optional[float]]:
        """Определяет наличие НДС в счете и извлекает сумму НДС"""
        vat_rate = None
        vat_amount = None
        has_vat = False

        # Сначала ищем конкретную сумму НДС
        vat_amount_patterns = [
            # ПРИОРИТЕТ 1: "НДС 20% - 9 161 руб. 86 коп." (прописью с пробелами)
            r'НДС\s*(\d+)%\s*[-–—:]\s*([0-9]{1,3}(?:\s[0-9]{3})*)\s*руб\.?\s*(\d{2})\s*коп',
            
            # ПРИОРИТЕТ 2: "В том числе НДС (20%): СУММА" (Excel: 3172.45 или OCR: 3 172,45)
            r'[вВ]\s*том\s*числе\s*НДС\s*\(?\s*(\d+)%?\)?[\s:|]*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 3: "В том числе НДС: СУММА" (без процента)
            r'[вВ]\s*том\s*числе\s*НДС[\s:|]*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 4: "НДС 20% - СУММА" или "НДС 20%: СУММА"
            r'НДС\s*(\d+)%\s*[-–—:]\s*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 5: "НДС (20%): СУММА"
            r'НДС\s*\((\d+)%\)[\s:|]*(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 6: "НДС 20% СУММА" (без разделителя)
            r'НДС\s*(\d+)%[\s]+(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 7: "НДС: СУММА" (без процента)
            r'НДС[\s:|]+(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
            
            # ПРИОРИТЕТ 8: НДС в строке с "Итого"
            r'(?:Итого|ИТОГО).*?НДС.*?(\d+(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
        ]

        for pattern in vat_amount_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                has_vat = True
                try:
                    groups = match.groups()
                    if len(groups) == 3:  # НДС прописью: ставка, рубли, копейки (например "НДС 20% - 9 161 руб. 86 коп")
                        vat_rate = float(groups[0])
                        rubles = groups[1].replace(' ', '')
                        kopeks = groups[2]
                        vat_amount = float(f"{rubles}.{kopeks}")
                        if self.debug:
                            print(f"Найден НДС прописью: ставка {vat_rate}%, сумма {vat_amount}")
                        return vat_amount, vat_rate
                    elif len(groups) == 2:  # НДС с процентом и суммой
                        vat_rate = float(groups[0])
                        vat_amount_str = groups[1].replace(' ', '').replace(',', '.')
                        vat_amount_str = re.sub(r'[^\d\.]', '', vat_amount_str)
                        vat_amount = float(vat_amount_str)
                        if self.debug:
                            print(f"Найден НДС: ставка {vat_rate}%, сумма {vat_amount}")
                        return vat_amount, vat_rate
                    elif len(groups) == 1:  # Только сумма НДС
                        vat_amount_str = groups[0].replace(' ', '').replace(',', '.')
                        vat_amount_str = re.sub(r'[^\d\.]', '', vat_amount_str)
                        vat_amount = float(vat_amount_str)
                        if self.debug:
                            print(f"Найдена сумма НДС: {vat_amount}")
                        break
                except (IndexError, ValueError) as e:
                    if self.debug:
                        print(f"Ошибка парсинга НДС: {e}, groups: {groups}")
                    continue

        # Паттерны для определения НДС (упрощенные - только определяем наличие)
        vat_patterns = [
            # НДС с указанием процента - ГЛАВНЫЙ ИНДИКАТОР
            r'НДС\s*(\d+)%',
            r'Н?ДС\s*(\d+)%',  # искажения OCR
            r'С\s*(\d+)%',     # НДС -> С

            # НДС в строках "В том числе НДС"
            r'(?:в\s*том\s*числе\s*|В\s*ТОМ\s*ЧИСЛЕ\s*)НДС',
            r'(?:в\s*том\s*числе\s*|том\s*числе\s*)Н?ДС',
            r'(?:в\s*том\s*числе\s*|том\s*числе\s*)С',

            # Простое упоминание НДС
            r'НДС[:\s]+[0-9]',
            r'Н?ДС[:\s]+[0-9]',
            r'(?<!\w)С[:\s]+[0-9]',  # избегаем ложных срабатываний
        ]

        # Если сумма НДС не найдена, ищем хотя бы ставку
        if not has_vat:
            for i, pattern in enumerate(vat_patterns):
                match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
                if match:
                    has_vat = True
                    try:
                        # Если найден процент, извлекаем его
                        if match.groups() and match.group(1).isdigit():
                            vat_rate = float(match.group(1))
                            if self.debug:
                                print(f"Найден НДС: ставка {vat_rate}% (паттерн {i})")
                            break
                    except (IndexError, ValueError):
                        pass

                    if self.debug:
                        print(f"Найден НДС без ставки (паттерн {i})")
                    # Если процент не найден, но НДС есть, ставим стандартную ставку
                    if not vat_rate:
                        vat_rate = 20.0  # Стандартная ставка в России
                    break

        # Возвращаем сумму НДС и ставку
        return vat_amount, vat_rate

    def calculate_vat_rate(self, vat_amount: float, total_amount: float) -> Optional[float]:
        """Вычисляет ставку НДС на основе суммы НДС и общей суммы"""
        if vat_amount and total_amount and total_amount > vat_amount:
            try:
                calculated_rate = (vat_amount / (total_amount - vat_amount)) * 100
                if abs(calculated_rate - 20) < 1:  # Близко к 20%
                    return 20.0
                elif abs(calculated_rate - 10) < 1:  # Близко к 10%
                    return 10.0
            except (ValueError, ZeroDivisionError):
                pass
        return None

    def extract_items(self, text: str) -> List[Dict[str, Any]]:
        """Извлекает товарные позиции - ВРЕМЕННО ОТКЛЮЧЕНО"""
        if self.debug:
            print("Парсинг товаров временно отключен - сосредоточимся на основных полях")
        return []

    def is_invoice_document(self, text: str) -> bool:
        """Проверяет, является ли документ счетом-фактурой"""
        # Ключевые слова для счетов
        invoice_keywords = [
            'счёт', 'счет', 'счёт-фактура', 'счет-фактура', 'invoice',
            'итого', 'всего к оплате', 'к доплате', 'общая стоимость'
        ]

        # Ключевые слова для НЕ счетов (исключения)
        exclusion_keywords = [
            'информационная карта', 'участника торгов', 'участника подрядных торгов',
            'анкета', 'заявка', 'справка о деятельности', 'реквизиты организации'
        ]

        text_lower = text.lower()

        # Проверяем на исключения
        for keyword in exclusion_keywords:
            if keyword in text_lower:
                return False

        # Проверяем наличие ключевых слов счета
        invoice_score = 0
        for keyword in invoice_keywords:
            if keyword in text_lower:
                invoice_score += 1

        return invoice_score >= 1

    def parse_invoice(self, text: str) -> Dict[str, Any]:
        """Основной метод парсинга счета"""
        if self.debug:
            print(f"Parsing text length: {len(text)} characters")
            print(f"First 200 chars: {repr(text[:200])}")  # Показываем raw содержимое

        # Проверяем, является ли документ счетом
        if not self.is_invoice_document(text):
            return {
                "error": "Загруженный документ не является счетом",
                "document_type": "unknown",
                "message": "Пожалуйста, загрузите файл со счетом-фактурой или коммерческим предложением"
            }

        # НЕ применяем clean_text к основному тексту - нужны переносы строк для таблиц
        # text = self.clean_text(text)

        # Извлекаем все данные
        invoice_number = self.extract_invoice_number(text)
        invoice_date = self.extract_date(text)
        due_date = self.extract_due_date(text)
        contractor_name = self.extract_contractor_name(text)
        total_amount = self.extract_total_amount(text)
        vat_amount, vat_rate = self.extract_vat_info(text)
        inns = self.extract_inn(text)

        # НДС теперь просто определяет наличие, не вычисляем сумму
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
                "vat_amount": vat_amount,  # Используем найденную сумму НДС
                "vat_rate": vat_rate,
                "has_vat": vat_amount is not None or vat_rate is not None  # НДС есть, если найдена сумма или ставка
            },
            "contractor": {
                "name": contractor_name,
                "inn": inns[0] if inns else None,  # Основной ИНН (поставщика)
                "all_inns": inns,  # Все найденные ИНН (поставщик + покупатель)
                "kpp": None,
                "address": None
            },
            "items": items
        }

        if self.debug:
            print(f"Parsed: {invoice_number}, {invoice_date}, {contractor_name}")
            print(f"VAT: {vat_amount}, Rate: {vat_rate}, Items: {len(items)}")

        return result


def parse_invoice_text(text: str) -> Dict[str, Any]:
    """Функция для использования в API"""
    parser = UltimateInvoiceParser(debug=False)
    return parser.parse_invoice(text)


def main():
    parser = argparse.ArgumentParser(description='Парсер счетов-фактур')

    # Группа взаимоисключающих аргументов - либо текст, либо файл
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument('--text', help='Текст счета для парсинга')
    input_group.add_argument('--file', help='Путь к файлу с текстом счета')

    parser.add_argument('--output-format', choices=['json', 'readable'], default='readable',
                       help='Формат вывода')
    parser.add_argument('--debug', action='store_true', help='Включить отладочный вывод')

    args = parser.parse_args()

    # Получаем текст либо из аргумента, либо из файла
    if args.text:
        text = args.text
    else:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                text = f.read()
        except Exception as e:
            print(f"Ошибка чтения файла {args.file}: {e}", file=sys.stderr)
            sys.exit(1)

    # Включаем debug только в readable режиме или если явно запрошен
    debug_mode = args.debug or (args.output_format == 'readable')

    invoice_parser = UltimateInvoiceParser()
    invoice_parser.debug = debug_mode

    result = invoice_parser.parse_invoice(text)

    if result is None:
        print("Ошибка: парсер вернул None")
        return

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
