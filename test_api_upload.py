#!/usr/bin/env python3
"""
Простой скрипт для тестирования API загрузки файлов
"""

import requests
import sys
import os

def test_smart_invoice_api(file_path):
    """Тестируем API smart-invoice"""
    url = "http://localhost:3000/api/smart-invoice"
    
    if not os.path.exists(file_path):
        print(f"❌ Файл не найден: {file_path}")
        return False
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f)}
            
            print(f"📤 Отправляем файл: {file_path}")
            response = requests.post(url, files=files, timeout=30)
            
            print(f"📊 Статус ответа: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Успешно!")
                print("📄 Результат:")
                print(result)
                return True
            else:
                print(f"❌ Ошибка: {response.status_code}")
                print(response.text)
                return False
                
    except requests.exceptions.ConnectionError:
        print("❌ Не удалось подключиться к серверу. Убедитесь, что сервер запущен на localhost:3000")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

if __name__ == "__main__":
    # Тестируем с текстовым файлом
    test_file = "temp/upload_1760169056132.txt"
    
    if len(sys.argv) > 1:
        test_file = sys.argv[1]
    
    print("🧪 Тестирование API загрузки файлов")
    print(f"🎯 Тестовый файл: {test_file}")
    print("-" * 50)
    
    success = test_smart_invoice_api(test_file)
    
    if success:
        print("\n✅ Тест пройден успешно!")
    else:
        print("\n❌ Тест не пройден!")
        sys.exit(1)