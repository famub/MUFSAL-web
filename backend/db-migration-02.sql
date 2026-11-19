-- MUFSAL - database migration 02: "Close my account" for doctors and radiologists
--
-- Run it once on your database after pulling. Safe to run again.
-- (A new database made from schema.sql already has the columns.)
--
-- delete_requested_at: empty = nothing asked. A time = the doctor or radiologist
--   pressed "Delete account" then; the account is locked until the admin acts.
-- deactivated_at:      empty = the account is open. A time = the admin closed it.
--
-- Both sit on professionals and not on users, because only a doctor or a
-- radiologist can ask: on users they would stay empty for every patient and
-- every admin for good.
--
-- Closing does not delete the row. The account signed reports or sent X-rays
-- in, and every foreign key to users is ON DELETE RESTRICT, so a deletion
-- would leave medical records with no author and the database refuses it.

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS delete_requested_at TIMESTAMP;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

-- carry over anything already asked for while the column was on users
UPDATE professionals p
   SET delete_requested_at = u.delete_requested_at
  FROM users u
 WHERE u.user_id = p.user_id
   AND u.delete_requested_at IS NOT NULL
   AND p.delete_requested_at IS NULL;

ALTER TABLE users DROP COLUMN IF EXISTS delete_requested_at;
