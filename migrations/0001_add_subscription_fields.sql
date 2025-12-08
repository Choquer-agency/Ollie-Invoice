-- Add subscription tracking fields to businesses table
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "subscription_tier" varchar DEFAULT 'free' NOT NULL;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "monthly_invoice_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "invoice_count_reset_date" timestamp DEFAULT now();

-- Add constraint to ensure valid subscription tier values
-- Note: PostgreSQL doesn't support enum constraints directly on varchar in this way,
-- but the application layer validates these values
COMMENT ON COLUMN "businesses"."subscription_tier" IS 'User subscription tier: free or pro';
COMMENT ON COLUMN "businesses"."monthly_invoice_count" IS 'Number of invoices sent this month (for free tier limit tracking)';
COMMENT ON COLUMN "businesses"."invoice_count_reset_date" IS 'Date when the monthly invoice count will reset';
