-- ============================================
-- Migracija: results → workouts + workout_sets
-- + Dodavanje has_weight kolone u categories
-- + Brisanje records tabele (ako postoji)
-- ============================================
-- NAPOMENA: Prvo napravi backup baze!
-- mysqldump -u root -p fitness_records > backup_pre_migracije.sql
-- ============================================

USE fitness_records;

-- ============================================
-- KORAK 1: Dodaj has_weight kolonu u categories
-- ============================================
ALTER TABLE categories
  ADD COLUMN has_weight TINYINT(1) NOT NULL DEFAULT 0 AFTER value_type;

-- Ako imaš kategorije koje koriste tegove, ažuriraj ih:
-- UPDATE categories SET has_weight = 1 WHERE id IN (...);

-- ============================================
-- KORAK 2: Kreiraj nove tabele
-- ============================================
CREATE TABLE IF NOT EXISTS workouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  attempt_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_workouts_user (user_id),
  INDEX idx_workouts_category (category_id),
  INDEX idx_workouts_date (attempt_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workout_sets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workout_id INT NOT NULL,
  set_number INT NOT NULL DEFAULT 1,
  reps DECIMAL(10,2) NOT NULL,
  weight DECIMAL(10,2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  INDEX idx_workout_sets_workout (workout_id)
) ENGINE=InnoDB;

-- ============================================
-- KORAK 3: Migriraj podatke iz results → workouts + workout_sets
-- Svaki results red postaje 1 workout sa N identičnih setova
-- (N = number_of_sets, svaki set ima value ponavljanja)
-- ============================================

-- Prvo ubaci workouts iz results
INSERT INTO workouts (id, user_id, category_id, attempt_date, notes, created_at)
SELECT id, user_id, category_id, attempt_date, notes, created_at
FROM results;

-- Sada za svaki workout kreiraj setove
-- Koristimo rekurzivni CTE ili proceduru za N setova
-- Jednostavniji pristup: koristi numbers tabelu

-- Kreiraj privremenu tabelu sa brojevima 1-100
CREATE TEMPORARY TABLE numbers (n INT);
INSERT INTO numbers (n) VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),
(21),(22),(23),(24),(25),(26),(27),(28),(29),(30),
(31),(32),(33),(34),(35),(36),(37),(38),(39),(40),
(41),(42),(43),(44),(45),(46),(47),(48),(49),(50);

-- Ubaci setove: za svaki result, napravi number_of_sets redova
INSERT INTO workout_sets (workout_id, set_number, reps, weight)
SELECT r.id, n.n, r.value, NULL
FROM results r
JOIN numbers n ON n.n <= r.number_of_sets;

-- Očisti privremenu tabelu
DROP TEMPORARY TABLE IF EXISTS numbers;

-- ============================================
-- KORAK 4: Obriši staru results tabelu
-- ============================================
-- OPREZ: Ovo je destruktivna operacija!
-- Proverite da li su podaci ispravno migrirani pre brisanja.

-- SELECT COUNT(*) FROM workouts;        -- Treba da bude = COUNT(*) FROM results
-- SELECT COUNT(*) FROM workout_sets;    -- Treba da bude = SUM(number_of_sets) FROM results

DROP TABLE IF EXISTS results;

-- ============================================
-- KORAK 5: Obriši records tabelu (ako postoji)
-- ============================================
DROP TABLE IF EXISTS records;

-- ============================================
-- GOTOVO! Proverite:
-- SELECT w.id, w.user_id, w.category_id, 
--        COUNT(ws.id) as total_sets,
--        SUM(ws.reps) as total_reps
-- FROM workouts w 
-- JOIN workout_sets ws ON ws.workout_id = w.id 
-- GROUP BY w.id 
-- LIMIT 10;
-- ============================================
