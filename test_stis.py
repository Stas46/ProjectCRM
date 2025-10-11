#!/usr/bin/env python3
import requests
import json
import os

def test_stis_contractor():
    url = 'http://localhost:3001/api/smart-invoice'
    
    # Создаем тестовый файл с содержимым как в логах
    test_content = '''=== ЛИСТ: Sheet1 ===
7720774346/470645001 ООО "Группа компаний "СтиС"     
Внимание!
Счет действителен в течение трех банковских дней.    
Оплата третьим лицом данного счета согласовывается с поставщиком (исполнителем).

СЧЕТ № 52804 от 24 Сентября 2025 г.
Заказчик:     ИП Ткачев С.О., тел., ИНН 784802613697 

Всего к оплате: 168897.22
В том числе НДС: 28149.55
'''
    
    # Создаем временный файл
    temp_file = 'temp_test_stis.txt'
    with open(temp_file, 'w', encoding='utf-8') as f:
        f.write(test_content)
    
    try:
        with open(temp_file, 'rb') as f:
            files = {'file': ('test_stis.txt', f, 'text/plain')}
            data = {'dpi': '300'}
            
            print(f"📤 Тестируем извлечение названия 'Группа компаний СтиС'")
            print(f"📁 Отправляем запрос к: {url}")
            
            response = requests.post(url, files=files, data=data)
            
            print(f"📊 Статус: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Успешно!")
                
                if result.get('success') and result.get('data'):
                    contractor = result['data']['contractor']
                    print(f"\n🎯 Результат извлечения:")
                    print(f"  • Название: '{contractor['name']}'")
                    print(f"  • ИНН: {contractor['inn']}")
                    
                    # Проверяем, правильно ли извлеклось название
                    if 'СтиС' in contractor['name']:
                        print("✅ УСПЕХ: Полное название 'Группа компаний СтиС' извлечено!")
                    else:
                        print("❌ Название неполное, нужно доработать регулярные выражения")
                        
                else:
                    print("❌ Нет данных в ответе")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
            else:
                print(f"❌ Ошибка: {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        # Удаляем временный файл
        if os.path.exists(temp_file):
            os.remove(temp_file)

if __name__ == "__main__":
    test_stis_contractor()