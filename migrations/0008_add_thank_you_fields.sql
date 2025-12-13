-- Add Thank You Notes fields to businesses table (Pro feature)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS thank_you_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS thank_you_message TEXT;

