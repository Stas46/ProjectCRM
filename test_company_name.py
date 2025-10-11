import re

text = '''7720774346/470645001 ООО "Группа компаний "СтиС"'''
patterns = [
    r'ООО\s*"(.*)"',              # Захватываем все между первой и последней кавычками  
    r'ООО\s*"([^"]*(?:"[^"]*)*)"', # Альтернативный подход
]

for i, pattern in enumerate(patterns):
    match = re.search(pattern, text, re.IGNORECASE)
    result = match.groups()[0] if match else "Нет"
    print(f'Паттерн {i+1}: {pattern}')
    print(f'Найдено: "{result}"')
    print()