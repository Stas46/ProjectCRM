#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Утилита для создания коллекции тестовых счетов и настройки парсера
"""

import os
import json
import argparse
from datetime import datetime
from typing import Dict, List, Any
from ultimate_invoice_parser import UltimateInvoiceParser


class ParserTestSuite:
    """Набор тестов для парсера счетов"""
    
    def __init__(self, test_data_dir: str = "test_invoices"):
        self.test_data_dir = test_data_dir
        self.parser = UltimateInvoiceParser()
        self.parser.debug = True
        
        # Создаем директорию для тестовых данных
        os.makedirs(test_data_dir, exist_ok=True)
    
    def add_test_invoice(self, name: str, text: str, expected_result: Dict[str, Any] = None):
        """Добавляет тестовый счет в коллекцию"""
        test_case = {
            "name": name,
            "text": text,
            "expected": expected_result,
            "created_at": datetime.now().isoformat(),
            "last_tested": None,
            "last_result": None
        }
        
        test_file = os.path.join(self.test_data_dir, f"{name}.json")
        with open(test_file, 'w', encoding='utf-8') as f:
            json.dump(test_case, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Тестовый счет '{name}' добавлен в {test_file}")
    
    def test_invoice(self, name: str) -> Dict[str, Any]:
        """Тестирует конкретный счет"""
        test_file = os.path.join(self.test_data_dir, f"{name}.json")
        
        if not os.path.exists(test_file):
            return {"error": f"Тестовый файл {test_file} не найден"}
        
        with open(test_file, 'r', encoding='utf-8') as f:
            test_case = json.load(f)
        
        print(f"\n🧪 Тестирование счета: {name}")
        print("=" * 50)
        
        # Запускаем парсер
        result = self.parser.parse_invoice(test_case["text"])
        
        # Сохраняем результат
        test_case["last_tested"] = datetime.now().isoformat()
        test_case["last_result"] = result
        
        with open(test_file, 'w', encoding='utf-8') as f:
            json.dump(test_case, f, ensure_ascii=False, indent=2)
        
        # Сравниваем с ожидаемым результатом
        if test_case.get("expected"):
            comparison = self.compare_results(result, test_case["expected"])
            result["comparison"] = comparison
        
        return result
    
    def test_all(self) -> Dict[str, Any]:
        """Тестирует все счета в коллекции"""
        results = {}
        test_files = [f for f in os.listdir(self.test_data_dir) if f.endswith('.json')]
        
        print(f"\n🚀 Запуск тестирования {len(test_files)} счетов...")
        
        for test_file in test_files:
            name = test_file[:-5]  # убираем .json
            results[name] = self.test_invoice(name)
        
        # Создаем сводный отчет
        report = self.generate_report(results)
        
        report_file = os.path.join(self.test_data_dir, "test_report.json")
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 Отчет сохранен в {report_file}")
        return report
    
    def compare_results(self, actual: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        """Сравнивает фактический и ожидаемый результаты"""
        comparison = {
            "matches": {},
            "differences": {},
            "score": 0,
            "total_fields": 0
        }
        
        # Сравниваем основные поля
        invoice_fields = ["number", "date", "due_date", "total_amount", "vat_amount", "vat_rate"]
        
        for field in invoice_fields:
            comparison["total_fields"] += 1
            actual_val = actual.get("invoice", {}).get(field)
            expected_val = expected.get("invoice", {}).get(field)
            
            if actual_val == expected_val:
                comparison["matches"][f"invoice.{field}"] = actual_val
                comparison["score"] += 1
            else:
                comparison["differences"][f"invoice.{field}"] = {
                    "actual": actual_val,
                    "expected": expected_val
                }
        
        # Сравниваем поставщика
        comparison["total_fields"] += 1
        actual_contractor = actual.get("contractor", {}).get("name")
        expected_contractor = expected.get("contractor", {}).get("name")
        
        if actual_contractor == expected_contractor:
            comparison["matches"]["contractor.name"] = actual_contractor
            comparison["score"] += 1
        else:
            comparison["differences"]["contractor.name"] = {
                "actual": actual_contractor,
                "expected": expected_contractor
            }
        
        # Вычисляем процент совпадений
        comparison["accuracy"] = (comparison["score"] / comparison["total_fields"]) * 100
        
        return comparison
    
    def generate_report(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Генерирует сводный отчет по тестированию"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": len(results),
            "passed": 0,
            "failed": 0,
            "average_accuracy": 0,
            "details": results,
            "issues": []
        }
        
        total_accuracy = 0
        
        for name, result in results.items():
            if "error" in result:
                report["failed"] += 1
                report["issues"].append(f"{name}: {result['error']}")
            else:
                report["passed"] += 1
                if "comparison" in result:
                    total_accuracy += result["comparison"]["accuracy"]
        
        if report["passed"] > 0:
            report["average_accuracy"] = total_accuracy / report["passed"]
        
        return report
    
    def list_tests(self):
        """Показывает список всех тестовых счетов"""
        test_files = [f for f in os.listdir(self.test_data_dir) if f.endswith('.json')]
        
        print(f"\n📋 Список тестовых счетов ({len(test_files)}):")
        print("=" * 50)
        
        for test_file in test_files:
            name = test_file[:-5]
            test_path = os.path.join(self.test_data_dir, test_file)
            
            try:
                with open(test_path, 'r', encoding='utf-8') as f:
                    test_case = json.load(f)
                
                print(f"📄 {name}")
                print(f"   Создан: {test_case.get('created_at', 'Неизвестно')}")
                if test_case.get('last_tested'):
                    print(f"   Последний тест: {test_case['last_tested']}")
                    if test_case.get('last_result', {}).get('comparison'):
                        accuracy = test_case['last_result']['comparison']['accuracy']
                        print(f"   Точность: {accuracy:.1f}%")
                print()
                
            except Exception as e:
                print(f"❌ {name}: Ошибка чтения ({e})")


def main():
    parser = argparse.ArgumentParser(description='Утилита для тестирования парсера счетов')
    parser.add_argument('command', choices=['add', 'test', 'test-all', 'list'], 
                        help='Команда для выполнения')
    parser.add_argument('--name', help='Имя тестового счета')
    parser.add_argument('--text', help='Текст счета')
    parser.add_argument('--file', help='Файл с текстом счета')
    parser.add_argument('--expected', help='Файл с ожидаемым результатом (JSON)')
    
    args = parser.parse_args()
    
    test_suite = ParserTestSuite()
    
    if args.command == 'add':
        if not args.name:
            print("❌ Требуется --name для команды add")
            return
        
        text = ""
        if args.text:
            text = args.text
        elif args.file:
            with open(args.file, 'r', encoding='utf-8') as f:
                text = f.read()
        else:
            print("❌ Требуется --text или --file для команды add")
            return
        
        expected = None
        if args.expected:
            with open(args.expected, 'r', encoding='utf-8') as f:
                expected = json.load(f)
        
        test_suite.add_test_invoice(args.name, text, expected)
    
    elif args.command == 'test':
        if not args.name:
            print("❌ Требуется --name для команды test")
            return
        
        result = test_suite.test_invoice(args.name)
        print("\n📊 Результат:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    elif args.command == 'test-all':
        report = test_suite.test_all()
        print("\n📊 Сводный отчет:")
        print(f"Всего тестов: {report['total_tests']}")
        print(f"Пройдено: {report['passed']}")
        print(f"Провалено: {report['failed']}")
        print(f"Средняя точность: {report['average_accuracy']:.1f}%")
        
        if report['issues']:
            print("\n❌ Проблемы:")
            for issue in report['issues']:
                print(f"  - {issue}")
    
    elif args.command == 'list':
        test_suite.list_tests()


if __name__ == "__main__":
    main()