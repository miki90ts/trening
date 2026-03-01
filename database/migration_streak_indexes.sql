-- ============================================
-- Migracija: Optimizacija streak upita
-- Dodaje kompozitni indeks za workouts(user_id, attempt_date)
-- ============================================

USE fitness_records;

ALTER TABLE workouts
  ADD INDEX idx_workouts_user_attempt_date (user_id, attempt_date);
