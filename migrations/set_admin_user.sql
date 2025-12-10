-- =====================================================
-- SET ADMIN USER
-- =====================================================
-- This script sets a user as an admin in Ollie Invoice
-- 
-- Usage:
-- 1. Open your Supabase SQL Editor
-- 2. Replace 'your-email@example.com' with your actual email
-- 3. Run this script
-- =====================================================

-- Set your email here
DO $$
DECLARE
  user_email TEXT := 'your-email@example.com';  -- CHANGE THIS!
  user_record RECORD;
BEGIN
  -- Find the user
  SELECT * INTO user_record FROM users WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Set admin flag
  UPDATE users SET is_admin = true WHERE email = user_email;
  
  -- Confirm
  RAISE NOTICE '✅ Successfully set % as admin', user_email;
  RAISE NOTICE '   User ID: %', user_record.id;
  RAISE NOTICE '   Name: % %', user_record.first_name, user_record.last_name;
END $$;

-- Verify the change
SELECT 
  id,
  email,
  first_name,
  last_name,
  is_admin,
  created_at
FROM users 
WHERE is_admin = true;


