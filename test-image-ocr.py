import subprocess
import json
import os

# JPG файл
image_file = "test-invoices/счет 5146 от 06.11.25.jpg"

python_exe = "C:/Users/Stas/AppData/Local/Programs/Python/Python313/python.exe"

print("=" * 80)
print(f"ТЕСТИРОВАНИЕ OCR И ПАРСЕРА НА ИЗОБРАЖЕНИИ")
print(f"Файл: {os.path.basename(image_file)}")
print("=" * 80)

# Используем Google Vision API для OCR
from google.cloud import vision
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'google-credentials.json'

client = vision.ImageAnnotatorClient()

with open(image_file, 'rb') as f:
    content = f.read()

image = vision.Image(content=content)
response = client.text_detection(image=image)

if response.text_annotations:
    text = response.text_annotations[0].description
    print(f"\n✓ OCR извлечено символов: {len(text)}")
    print(f"\nПервые 500 символов:\n{text[:500]}")
    
    # Сохраняем в файл
    temp_file = "temp/ocr-image.txt"
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
    
    if result.returncode != 0:
        print(f"\n❌ Ошибка парсинга: {result.stderr}")
        print(f"Stdout: {result.stdout}")
    else:
        try:
            parsed = json.loads(result.stdout)
            
            print(f"\n{'='*80}")
            print("📋 РЕЗУЛЬТАТЫ ПАРСИНГА:")
            print(f"{'='*80}")
            
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
        
        except json.JSONDecodeError as e:
            print(f"\n❌ Ошибка парсинга JSON: {e}")
            print(f"Первые 500 символов вывода:\n{result.stdout[:500]}")
else:
    print("\n❌ OCR не смог извлечь текст из изображения")
    if response.error.message:
        print(f"Ошибка: {response.error.message}")

print(f"\n{'='*80}")
print("ТЕСТИРОВАНИЕ ЗАВЕРШЕНО")
print(f"{'='*80}")
