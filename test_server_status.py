#!/usr/bin/env python3
"""
Простой тест связности с сервером
"""

import requests
import time

def test_server_connectivity():
    """Проверяем связность с сервером"""
    url = "http://localhost:3000/simple-test.html"
    
    try:
        print("🔍 Проверяем связность с сервером...")
        response = requests.get(url, timeout=10)
        print(f"✅ Сервер доступен! Статус: {response.status_code}")
        
        if response.status_code == 200:
            print("📄 Веб-интерфейс работает")
            return True
        else:
            print(f"⚠️ Неожиданный статус: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Сервер недоступен")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def test_api_endpoint():
    """Проверяем API endpoint"""
    url = "http://localhost:3000/api/smart-invoice"
    
    try:
        print("\n🔍 Проверяем API endpoint...")
        # Пустой POST запрос для проверки endpoint
        response = requests.post(url, timeout=10)
        print(f"📊 API доступен! Статус: {response.status_code}")
        
        if response.status_code in [400, 422]:  # Ожидаем ошибку валидации
            print("✅ API endpoint работает (ошибка валидации - это нормально)")
            return True
        else:
            print(f"⚠️ Неожиданный статус: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ API недоступен")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Тестирование сервера CRM")
    print("=" * 40)
    
    # Даём серверу время запуститься
    print("⏳ Ждём 3 секунды...")
    time.sleep(3)
    
    # Тестируем связность
    server_ok = test_server_connectivity()
    api_ok = test_api_endpoint()
    
    print("\n" + "=" * 40)
    if server_ok and api_ok:
        print("✅ Все тесты пройдены! Сервер готов к работе")
    else:
        print("❌ Обнаружены проблемы с сервером")
        
    print("\n🌐 Откройте в браузере: http://localhost:3000/simple-test.html")