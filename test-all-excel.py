import subprocess
import json
import os

excel_files = [
    "test-invoices/Сч№59261.xls",
    "test-invoices/Сч№60096.xls",
    "test-invoices/Счет на оплату № 3253 от 30.10.2025.xls",
    "test-invoices/Счет на оплату № 3349 от 05.11.2025.xls",
    "test-invoices/Счет на оплату № УТ-905 от 07.11.2025 (2).xlsx"
]

python_exe = "C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe"

print("=" * 80)
print("ТЕСТИРОВАНИЕ ПАРСЕРА НА ВСЕХ EXCEL ФАЙЛАХ")
print("=" * 80)

for excel_file in excel_files:
    if not os.path.exists(excel_file):
        print(f"\n❌ Файл не найден: {excel_file}")
        continue
    
    print(f"\n{'='*80}")
    print(f"📄 Файл: {os.path.basename(excel_file)}")
    print(f"{'='*80}")
    
    # Извлекаем текст из Excel
    try:
        result = subprocess.run(
            [python_exe, "python-scripts/office_to_text.py", excel_file],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode != 0:
            print(f"❌ Ошибка извлечения текста: {result.stderr}")
            continue
        
        # Парсим JSON ответ
        office_result = json.loads(result.stdout)
        
        if "error" in office_result:
            print(f"❌ Ошибка: {office_result['error']}")
            continue
        
        text = office_result.get("text", "")
        print(f"✓ Извлечено символов: {len(text)}")
        
        # Сохраняем в временный файл
        temp_file = "temp/current-excel.txt"
        os.makedirs("temp", exist_ok=True)
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(text)
        
        # Парсим через ultimate_invoice_parser
        result = subprocess.run(
            [python_exe, "ultimate_invoice_parser.py", "--file", temp_file, "--output-format", "json"],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        # Парсим результат
        if result.returncode != 0:
            print(f"❌ Ошибка парсинга: {result.stderr}")
            print(f"Stdout: {result.stdout}")
            continue
        
        # Парсим JSON из вывода
        try:
            parsed = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            print(f"❌ Ошибка парсинга JSON: {e}")
            print(f"Первые 500 символов вывода:\n{result.stdout[:500]}")
            continue
        # Парсим JSON из вывода
        try:
            parsed = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            print(f"❌ Ошибка парсинга JSON: {e}")
            print(f"Первые 500 символов вывода:\n{result.stdout[:500]}")
            continue
        
        print(f"\n📋 РЕЗУЛЬТАТЫ ПАРСИНГА:")
        invoice = parsed.get('invoice', {})
        contractor = parsed.get('contractor', {})
        
        print(f"   Номер счета: {invoice.get('number', 'НЕ НАЙДЕН')}")
        print(f"   Дата: {invoice.get('date', 'НЕ НАЙДЕНА')}")
        print(f"   Поставщик: {contractor.get('name', 'НЕ НАЙДЕН')}")
        print(f"   ИНН поставщика: {contractor.get('inn', 'НЕ НАЙДЕН')}")
        print(f"   Сумма: {invoice.get('total_amount', 'НЕ НАЙДЕНА')}")
        print(f"   НДС: {invoice.get('vat_amount', 'НЕ НАЙДЕН')}")
        print(f"   Ставка НДС: {invoice.get('vat_rate', 'НЕ УКАЗАНА')}")
        
        # Проверяем критичные поля
        missing = []
        if not invoice.get('number'):
            missing.append('номер счета')
        if not contractor.get('name'):
            missing.append('поставщик')
        if not invoice.get('total_amount'):
            missing.append('сумма')
        
        if missing:
            print(f"\n⚠️  НЕ РАСПОЗНАНЫ: {', '.join(missing)}")
        else:
            print(f"\n✅ ВСЕ КЛЮЧЕВЫЕ ПОЛЯ РАСПОЗНАНЫ")
    
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()

print(f"\n{'='*80}")
print("ТЕСТИРОВАНИЕ ЗАВЕРШЕНО")
print(f"{'='*80}")
