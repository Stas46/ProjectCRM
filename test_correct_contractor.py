#!/usr/bin/env python3
import requests
import json
import os

def test_correct_contractor():
    url = 'http://localhost:3000/api/smart-invoice'
    
    # Создаем файл с данными как в реальном случае
    test_content = '''=== ЛИСТ: Sheet1 ===
7720774346/470645001 ООО "Группа компаний "СтиС"     
Внимание!
Счет действителен в течение трех банковских дней.    

Получатель
7720774346/470645001 ООО "Группа компаний "СтиС" Сч. № 40702810738000461251
Банк получателя БИК 044525225
ПАО "СБЕРБАНК" г.Москва Сч. № 30101810400000000225   

СЧЕТ № 52804 от 24 Сентября 2025 г.

Заказчик:     ИП Ткачев С.О., тел., ИНН 784802613697 
Получатель:    ИП Ткачев С.О., тел.

Всего к оплате: 168897.22
В том числе НДС: 28149.55
'''
    
    temp_file = 'temp_correct_contractor.txt'
    with open(temp_file, 'w', encoding='utf-8') as f:
        f.write(test_content)
    
    try:
        with open(temp_file, 'rb') as f:
            files = {'file': ('correct_contractor.txt', f, 'text/plain')}
            data = {'dpi': '300'}
            
            print("📤 Тестируем ИСПРАВЛЕННОЕ извлечение контрагента")
            print("🎯 ОЖИДАЕМ:")
            print("   • Поставщик: 'ООО Группа компаний СтиС'")
            print("   • ИНН: '7720774346' (поставщика)")
            print("❌ НЕ ДОЛЖНО БЫТЬ:")
            print("   • Заказчика: 'ИП Ткачев С.О.'")
            print("   • ИНН: '784802613697' (заказчика)")
            print()
            
            response = requests.post(url, files=files, data=data)
            print(f"📊 Статус ответа: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get('success') and result.get('data'):
                    contractor = result['data']['contractor']
                    invoice = result['data']['invoice']
                    
                    print("✅ API ответил успешно!")
                    print(f"\n📋 РЕЗУЛЬТАТ ИЗВЛЕЧЕНИЯ:")
                    print(f"   Счет № {invoice['number']}")
                    print(f"   Дата: {invoice['date']}")
                    print(f"   Сумма: {invoice['total_amount']} руб.")
                    print(f"   НДС: {invoice['vat_amount']} руб.")
                    print()
                    print(f"🏢 КОНТРАГЕНТ:")
                    print(f"   Название: '{contractor['name']}'")
                    print(f"   ИНН: {contractor['inn']}")
                    print()
                    
                    # Проверяем правильность
                    results = []
                    
                    if 'Группа компаний' in str(contractor['name']) and 'СтиС' in str(contractor['name']):
                        results.append("✅ ПРАВИЛЬНО: Извлечена 'Группа компаний СтиС'")
                    elif 'Ткачев' in str(contractor['name']):
                        results.append("❌ ОШИБКА: Извлечен заказчик 'Ткачев' вместо поставщика")
                    else:
                        results.append(f"⚠️ НЕОЖИДАННО: Извлечено '{contractor['name']}'")
                    
                    if contractor['inn'] == '7720774346':
                        results.append("✅ ПРАВИЛЬНО: ИНН поставщика '7720774346'")
                    elif contractor['inn'] == '784802613697':
                        results.append("❌ ОШИБКА: ИНН заказчика '784802613697' вместо поставщика")
                    else:
                        results.append(f"⚠️ НЕОЖИДАННЫЙ ИНН: {contractor['inn']}")
                    
                    print("🔍 АНАЛИЗ РЕЗУЛЬТАТОВ:")
                    for result_line in results:
                        print(f"   {result_line}")
                    
                    # Общий вывод
                    success_count = sum(1 for r in results if r.startswith("✅"))
                    if success_count == len(results):
                        print("\n🎉 ТЕСТ ПРОЙДЕН! Контрагент извлечен правильно!")
                    else:
                        print(f"\n⚠️ ТЕСТ ЧАСТИЧНО ПРОЙДЕН: {success_count}/{len(results)} проверок успешно")
                        
                else:
                    print("❌ API не вернул данные")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
            else:
                print(f"❌ Ошибка API: {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"❌ Ошибка выполнения: {e}")
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

if __name__ == "__main__":
    test_correct_contractor()