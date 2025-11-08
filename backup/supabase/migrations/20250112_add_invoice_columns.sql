-- Migration to add missing columns to invoices table
-- Run this in Supabase SQL Editor

BEGIN;

-- Add missing columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS has_vat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_inn TEXT;

-- Update existing records with default values
UPDATE invoices SET 
  has_vat = COALESCE(has_vat, FALSE),
  vat_amount = COALESCE(vat_amount, 0)
WHERE has_vat IS NULL OR vat_amount IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_inn ON invoices(supplier_inn);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;

COMMIT;