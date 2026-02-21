-- ============================================
-- Migracija: Vidljivost korisnika na Users listi
-- ============================================

USE fitness_records;

ALTER TABLE users
  ADD COLUMN show_in_users_list TINYINT(1) NOT NULL DEFAULT 1 AFTER is_approved;
