-- Add hide_branding column to businesses table
-- This is a Pro feature that allows users to hide Ollie Invoice branding from emails and public invoice pages
-- Default is false so branding shows by default (even for Pro users initially)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS hide_branding BOOLEAN DEFAULT FALSE;

