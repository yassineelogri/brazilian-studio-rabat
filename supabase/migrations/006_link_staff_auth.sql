-- supabase/migrations/006_link_staff_auth.sql
-- Run this in Supabase SQL Editor after getting your user UUID from:
--   Authentication > Users > copy the UUID of your staff user
--
-- Replace 'YOUR-AUTH-USER-UUID-HERE' with the actual UUID.

UPDATE staff
SET auth_user_id = 'YOUR-AUTH-USER-UUID-HERE'
WHERE name = 'YOUR-STAFF-NAME-HERE'
  AND auth_user_id IS NULL;

-- Verify:
SELECT id, name, role, auth_user_id FROM staff;
