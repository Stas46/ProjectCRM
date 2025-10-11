#!/usr/bin/env python3
import requests
import json
import os

def test_inn_display():
    url = 'http://localhost:3000/api/smart-invoice'
    
    # Создаем тестовый файл с четкими данными
    test_content = '''СЧЕТ № 12345 от 28 сентября 2025 г.

Поставщик: ООО "Группа компаний СтиС", ИНН 7720774346, КПП 470645001
Адрес: г. Москва, ул. Примерная, д. 1

Покупатель: ИП Ткачев С.О., ИНН 784802613697
Адрес: г. Санкт-Петербург

Товары:
1. Стеклопакет - 10 шт. - 15000.00 руб.
2. Доставка - 1 услуга - 5000.00 руб.

Итого без НДС: 155000.00 руб.
НДС 20%: 31000.00 руб.
Всего к оплате: 186000.00 руб.
'''
    
    temp_file = 'temp_test_inn.txt'
    with open(temp_file, 'w', encoding='utf-8') as f:
        f.write(test_content)
    
    try:
        with open(temp_file, 'rb') as f:
            files = {'file': ('test_inn.txt', f, 'text/plain')}
            data = {'dpi': '300'}
            
            print(f"📤 Тестируем отображение ИНН")
            print(f"   ОЖИДАЕМ: Поставщик 'ООО Группа компаний СтиС' с ИНН '7720774346'")
            print(f"📁 Отправляем запрос к: {url}")
            
            response = requests.post(url, files=files, data=data)
            
            print(f"📊 Статус: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get('success') and result.get('data'):
                    print("✅ Успешно!")
                    
                    # Полная информация о счете
                    invoice = result['data']['invoice']
                    contractor = result['data']['contractor']
                    
                    print(f"\n🧾 ИНФОРМАЦИЯ О СЧЕТЕ:")
                    print(f"  • Номер: {invoice['number']}")
                    print(f"  • Дата: {invoice['date']}")
                    print(f"  • Сумма: {invoice['total_amount']} руб.")
                    print(f"  • НДС: {invoice['vat_amount']} руб.")
                    
                    print(f"\n🏢 ИНФОРМАЦИЯ О КОНТРАГЕНТЕ:")
                    print(f"  • Название: '{contractor['name']}'")
                    print(f"  • ИНН: {contractor['inn']}")
                    print(f"  • КПП: {contractor['kpp']}")
                    print(f"  • Адрес: {contractor['address']}")
                    
                    # Проверяем корректность
                    checks = []
                    if contractor['name'] and 'СтиС' in contractor['name']:
                        checks.append("✅ Название поставщика корректное")
                    else:
                        checks.append(f"❌ Неверное название: {contractor['name']}")
                        
                    if contractor['inn'] == '7720774346':
                        checks.append("✅ ИНН поставщика корректный")
                    else:
                        checks.append(f"❌ Неверный ИНН: {contractor['inn']}")
                        
                    if invoice['number'] == '12345':
                        checks.append("✅ Номер счета корректный")
                    else:
                        checks.append(f"❌ Неверный номер: {invoice['number']}")
                    
                    print(f"\n🔍 ПРОВЕРКА РЕЗУЛЬТАТОВ:")
                    for check in checks:
                        print(f"  {check}")
                        
                else:
                    print("❌ Нет данных в ответе")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
            else:
                print(f"❌ Ошибка: {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

if __name__ == "__main__":
    test_inn_display()