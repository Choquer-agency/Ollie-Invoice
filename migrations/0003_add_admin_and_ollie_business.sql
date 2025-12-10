-- Add admin flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add a flag to identify the Ollie Invoice business (used for internal invoicing)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_ollie_business BOOLEAN DEFAULT false;

-- Create an index on is_ollie_business for faster lookups
CREATE INDEX IF NOT EXISTS idx_businesses_ollie ON businesses(is_ollie_business) WHERE is_ollie_business = true;


