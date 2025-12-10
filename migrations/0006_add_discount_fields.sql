-- Add discount fields to invoices table
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "discount_type" varchar;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "discount_value" numeric(12, 2) DEFAULT '0';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(12, 2) DEFAULT '0';

