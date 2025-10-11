-- Таблица контрагентов
CREATE TABLE contractors (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  inn TEXT UNIQUE,
  kpp TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица счетов
CREATE TABLE invoices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contractor_id TEXT REFERENCES contractors(id),
  project_id TEXT REFERENCES projects(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  total_amount DECIMAL(15,2) NOT NULL,
  vat_amount DECIMAL(15,2),
  vat_rate DECIMAL(5,2),
  has_vat BOOLEAN DEFAULT false,
  currency TEXT DEFAULT 'RUB',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  pdf_file_path TEXT,
  ocr_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Унифицированная номенклатура
CREATE TABLE unified_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  unit TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Позиции в счетах
CREATE TABLE invoice_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  invoice_id TEXT REFERENCES invoices(id),
  unified_item_id TEXT REFERENCES unified_items(id),
  original_name TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit TEXT,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  position_number INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- История цен
CREATE TABLE price_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  unified_item_id TEXT REFERENCES unified_items(id),
  contractor_id TEXT REFERENCES contractors(id),
  invoice_id TEXT REFERENCES invoices(id),
  price DECIMAL(15,2) NOT NULL,
  unit TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Варианты названий для унификации
CREATE TABLE item_name_variants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  unified_item_id TEXT REFERENCES unified_items(id),
  variant_name TEXT NOT NULL,
  similarity_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX idx_contractors_inn ON contractors(inn);
CREATE INDEX idx_invoices_contractor ON invoices(contractor_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_unified ON invoice_items(unified_item_id);
CREATE INDEX idx_price_history_item ON price_history(unified_item_id);
CREATE INDEX idx_price_history_date ON price_history(date);