-- Add Stripe customer ID to businesses table for subscription management
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar;

COMMENT ON COLUMN "businesses"."stripe_customer_id" IS 'Stripe Customer ID for managing subscriptions via customer portal';

