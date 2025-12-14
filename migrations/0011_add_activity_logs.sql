-- Migration: Add activity_logs table for tracking user actions
-- This enables admin dashboard to track user activities like logins, client creation, invoice sending, etc.

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" VARCHAR NOT NULL,
  "entity_type" VARCHAR,
  "entity_id" VARCHAR,
  "metadata" JSONB,
  "ip_address" VARCHAR,
  "user_agent" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "IDX_activity_logs_user_id" ON "activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "IDX_activity_logs_created_at" ON "activity_logs"("created_at");
CREATE INDEX IF NOT EXISTS "IDX_activity_logs_action" ON "activity_logs"("action");

-- Comments
COMMENT ON TABLE "activity_logs" IS 'Tracks all user activities for admin monitoring and analytics';
COMMENT ON COLUMN "activity_logs"."action" IS 'Type of action: login, logout, create_invoice, send_invoice, add_client, etc.';
COMMENT ON COLUMN "activity_logs"."entity_type" IS 'Type of entity affected: invoice, client, payment, business, etc.';
COMMENT ON COLUMN "activity_logs"."entity_id" IS 'ID of the entity affected';
COMMENT ON COLUMN "activity_logs"."metadata" IS 'Additional context as JSON (invoice number, client name, amount, etc.)';

