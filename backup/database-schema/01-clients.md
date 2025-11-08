# 👥 Таблица: CLIENTS (Клиенты)

## 📋 Описание
Таблица для хранения информации о клиентах компании.
Поддерживает как физических, так и юридических лиц.

## 🗃️ Структура таблицы

```sql
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Основная информация
  type VARCHAR(20) NOT NULL CHECK (type IN ('individual', 'company')),
  -- individual - физ.лицо, company - юр.лицо
  
  name VARCHAR(255) NOT NULL,
  -- ФИО для физ.лица или название компании
  
  -- Контактная информация
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Для юридических лиц
  company_name VARCHAR(255),
  -- Полное название организации
  
  inn VARCHAR(12),
  -- ИНН (10 цифр для организаций, 12 для ИП)
  
  kpp VARCHAR(9),
  -- КПП (только для юр.лиц)
  
  ogrn VARCHAR(15),
  -- ОГРН/ОГРНИП
  
  legal_address TEXT,
  -- Юридический адрес
  
  actual_address TEXT,
  -- Фактический адрес
  
  -- Контактное лицо (для юр.лиц)
  contact_person VARCHAR(255),
  contact_person_phone VARCHAR(50),
  contact_person_email VARCHAR(255),
  contact_person_position VARCHAR(100),
  
  -- Дополнительная информация
  description TEXT,
  -- Заметки о клиенте
  
  source VARCHAR(100),
  -- Источник клиента (реклама, рекомендация, сайт и т.д.)
  
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  -- Рейтинг клиента (1-5)
  
  is_active BOOLEAN DEFAULT true,
  -- Активен ли клиент
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 📊 Индексы

```sql
-- Поиск по имени
CREATE INDEX idx_clients_name ON public.clients(name);

-- Поиск по email
CREATE INDEX idx_clients_email ON public.clients(email);

-- Поиск по телефону
CREATE INDEX idx_clients_phone ON public.clients(phone);

-- Поиск по ИНН
CREATE INDEX idx_clients_inn ON public.clients(inn);

-- Фильтр по типу
CREATE INDEX idx_clients_type ON public.clients(type);

-- Фильтр по статусу
CREATE INDEX idx_clients_is_active ON public.clients(is_active);
```

## 🔗 Связи

```sql
-- Связь с проектами
ALTER TABLE public.projects 
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_client_id ON public.projects(client_id);
```

## 📝 Примеры использования

### Физическое лицо
```sql
INSERT INTO public.clients (
  type, name, phone, email, 
  actual_address, description, source, rating
) VALUES (
  'individual',
  'Иванов Иван Иванович',
  '+7 (999) 123-45-67',
  'ivanov@example.com',
  'г. Москва, ул. Ленина, д. 10, кв. 5',
  'Постоянный клиент, установка окон в квартире',
  'recommendation',
  5
);
```

### Юридическое лицо
```sql
INSERT INTO public.clients (
  type, name, company_name, 
  inn, kpp, ogrn,
  legal_address, actual_address,
  phone, email,
  contact_person, contact_person_phone, contact_person_email, contact_person_position,
  description, source, rating
) VALUES (
  'company',
  'ООО "Рога и Копыта"',
  'Общество с ограниченной ответственностью "Рога и Копыта"',
  '7707123456',
  '770701001',
  '1027700123456',
  'г. Москва, ул. Пушкина, д. 1',
  'г. Москва, ул. Пушкина, д. 1, офис 10',
  '+7 (495) 123-45-67',
  'info@rogaikopyta.ru',
  'Петров Петр Петрович',
  '+7 (495) 123-45-68',
  'petrov@rogaikopyta.ru',
  'Генеральный директор',
  'Крупный заказчик, работа с 2023 года',
  'website',
  4
);
```

## 🎯 Поля для TypeScript

```typescript
export interface Client {
  id: string;
  type: 'individual' | 'company';
  name: string;
  phone?: string;
  email?: string;
  
  // Для юр.лиц
  company_name?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legal_address?: string;
  actual_address?: string;
  
  // Контактное лицо
  contact_person?: string;
  contact_person_phone?: string;
  contact_person_email?: string;
  contact_person_position?: string;
  
  // Дополнительно
  description?: string;
  source?: string;
  rating?: number; // 1-5
  is_active: boolean;
  
  created_at: string;
  updated_at?: string;
}

export type NewClient = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
export type UpdateClient = Partial<NewClient>;
```

## ✅ Валидация

- `type` - обязательно, только 'individual' или 'company'
- `name` - обязательно, максимум 255 символов
- `inn` - опционально, 10 или 12 цифр
- `kpp` - опционально, 9 цифр
- `email` - опционально, валидный email
- `phone` - опционально, может быть любой формат
- `rating` - опционально, от 1 до 5
- `is_active` - по умолчанию true

## 🔄 Триггеры

```sql
-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();
```

## 📈 Статистика и отчеты

```sql
-- Количество клиентов по типам
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM public.clients
GROUP BY type;

-- Клиенты с наибольшим количеством проектов
SELECT 
  c.id,
  c.name,
  c.email,
  COUNT(p.id) as projects_count
FROM public.clients c
LEFT JOIN public.projects p ON p.client_id = c.id
GROUP BY c.id, c.name, c.email
ORDER BY projects_count DESC
LIMIT 10;

-- Средний рейтинг клиентов
SELECT 
  AVG(rating) as avg_rating,
  COUNT(CASE WHEN rating >= 4 THEN 1 END) as high_rated_count
FROM public.clients
WHERE rating IS NOT NULL;
```
