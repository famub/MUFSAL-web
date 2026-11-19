-- MUFSAL - database migration 02: "Delete my account" for doctors and radiologists
--
-- Run it once on your database after pulling. Safe to run again.
-- (A new database made from schema.sql already has the column.)
--
-- delete_requested_at: empty = a normal account. A time = the doctor or radiologist pressed
-- "Delete account" at that time; the account is locked until the admin deletes it.

ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_requested_at TIMESTAMP;
