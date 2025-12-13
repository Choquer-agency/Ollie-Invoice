-- Add multi-payment methods fields to businesses table (Pro features)

-- Bank Transfer fields
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS accept_bank_transfer BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_swift_code VARCHAR(20);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_instructions TEXT;

-- PayPal fields
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS accept_paypal BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS paypal_email VARCHAR(255);

-- Venmo fields
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS accept_venmo BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS venmo_username VARCHAR(100);

-- Zelle fields
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS accept_zelle BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS zelle_email VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS zelle_phone VARCHAR(50);

-- Add paymentMethods jsonb field to invoices for multi-select payment methods
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_methods JSONB;

