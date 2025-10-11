#!/usr/bin/env python3
import requests
import json

def test_smart_invoice_api():
    url = 'http://localhost:3001/api/smart-invoice'
    
    # Путь к тестовому файлу
    file_path = 'python-scripts/test_invoice_demo.xlsx'
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': ('test_invoice_demo.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            data = {'dpi': '300'}
            
            print(f"📤 Отправляем запрос к API: {url}")
            print(f"📁 Файл: {file_path}")
            
            response = requests.post(url, files=files, data=data)
            
            print(f"📊 Статус ответа: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Запрос выполнен успешно!")
                print(f"📋 Результат: {json.dumps(result, indent=2, ensure_ascii=False)}")
                
                if result.get('success') and result.get('data'):
                    data = result['data']
                    print("\n🎯 Извлеченная информация:")
                    print(f"  • Номер счета: {data['invoice']['number']}")
                    print(f"  • Дата: {data['invoice']['date']}")
                    print(f"  • Сумма: {data['invoice']['total_amount']}")
                    print(f"  • НДС: {data['invoice']['vat_amount']}")
                    print(f"  • Поставщик: {data['contractor']['name']}")
                    print(f"  • ИНН: {data['contractor']['inn']}")
                    
            else:
                print(f"❌ Ошибка: {response.status_code}")
                print(f"📄 Ответ: {response.text}")
                
    except FileNotFoundError:
        print(f"❌ Файл не найден: {file_path}")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    test_smart_invoice_api()