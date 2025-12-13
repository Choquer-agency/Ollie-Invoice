-- Add Thank You Notes fields to businesses table (Pro feature)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS thank_you_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS thank_you_message TEXT;

-- Add thank you sent timestamp to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS thank_you_sent_at TIMESTAMP;

