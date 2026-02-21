-- ============================================
-- Fitness Records Tracker - MySQL Schema
-- Verzija 2: workouts + workout_sets umesto results
-- ============================================

CREATE DATABASE IF NOT EXISTS fitness_records
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fitness_records;

-- ============================================
-- 1. USERS (Učesnici)
-- ============================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  nickname VARCHAR(100) DEFAULT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  show_in_users_list TINYINT(1) NOT NULL DEFAULT 1,
  profile_image VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ============================================
-- 1b. REFRESH TOKENS (Za bezbednu autentifikaciju)
-- ============================================
CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_tokens_user (user_id),
  INDEX idx_refresh_tokens_hash (token_hash)
) ENGINE=InnoDB;

-- ============================================
-- 2. EXERCISES (Vežbe)
-- ============================================
CREATE TABLE exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  icon VARCHAR(50) DEFAULT '💪',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- 3. CATEGORIES (Kategorije rekorda)
--    has_weight: 1 = vežba koristi tegove (bench, squat...)
--               0 = bodyweight (sklekovi, zgibovi...)
-- ============================================
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exercise_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  value_type ENUM('reps', 'seconds', 'minutes', 'meters', 'kg') NOT NULL DEFAULT 'reps',
  has_weight TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- 4. WORKOUTS (Uneti treninzi/vežbanja)
--    Svaki workout je jedno "unosenje" rezultata
-- ============================================
CREATE TABLE workouts (
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

-- ============================================
-- 5. WORKOUT_SETS (Setovi unutar treninga)
--    reps = vrednost (ponavljanja, sekunde, metri itd.)
--    weight = težina u kg (NULL za bodyweight vežbe)
-- ============================================
CREATE TABLE workout_sets (
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
-- SEED DATA - Početni podaci
-- ============================================

-- Vežbe
INSERT INTO exercises (name, description, icon) VALUES
('Sklekovi', 'Klasično sklekovanje - push-ups', '🫸'),
('Čučnjevi', 'Čučnjevi bez opterećenja - squats', '🦵'),
('Plank', 'Statička vežba za core - plank hold', '🧘'),
('Zgibovi', 'Zgibovi na šipci - pull-ups', '💪'),
('Trbušnjaci', 'Klasični trbušnjaci - sit-ups', '🏋️'),
('Burpees', 'Kompleksna vežba celog tela', '🔥'),
('Bench Press', 'Potisak sa klupe - bench press', '🏋️'),
('Deadlift', 'Mrtvo dizanje - deadlift', '💪'),
('Squat', 'Čučanj sa tegom - barbell squat', '🦵');

-- Kategorije za Sklekove (bodyweight)
INSERT INTO categories (exercise_id, name, value_type, has_weight, description) VALUES
(1, 'Iz jedne serije', 'reps', 0, 'Maksimalan broj sklekova bez prestanka'),
(1, 'Ukupno na dan', 'reps', 0, 'Ukupan broj sklekova tokom jednog dana'),
(1, 'Na jednoj ruci', 'reps', 0, 'Maksimalan broj sklekova na jednoj ruci'),
(1, 'Za 3 minuta', 'reps', 0, 'Broj sklekova za 3 minuta');

-- Kategorije za Čučnjeve (bodyweight)
INSERT INTO categories (exercise_id, name, value_type, has_weight, description) VALUES
(2, 'Iz jedne serije', 'reps', 0, 'Maksimalan broj čučnjeva bez prestanka'),
(2, 'Za 5 minuta', 'reps', 0, 'Broj čučnjeva za 5 minuta');

-- Kategorije za Plank
INSERT INTO categories (exercise_id, name, value_type, has_weight, description) VALUES
(3, 'Najduže držanje', 'seconds', 0, 'Najduže držanje planka u sekundama');

-- Kategorije za Zgibove (bodyweight)
INSERT INTO categories (exercise_id, name, value_type, has_weight, description) VALUES
(4, 'Iz jedne serije', 'reps', 0, 'Maksimalan broj zgibova bez prestanka'),
(4, 'Ukupno na dan', 'reps', 0, 'Ukupan broj zgibova tokom jednog dana');

-- Kategorije za Bench Press (weighted)
INSERT INTO categories (exercise_id, name, value_type, has_weight, description) VALUES
(7, '1RM', 'kg', 1, 'Maksimalan teg za jedno ponavljanje'),
(7, 'Radni setovi', 'reps', 1, 'Radni setovi sa tegom');

-- Kategorije za Deadlift (weighted)
INSERT INTO categories (exercise_id, name, value_type, has_weight, description) VALUES
(8, '1RM', 'kg', 1, 'Maksimalan teg za jedno ponavljanje'),
(8, 'Radni setovi', 'reps', 1, 'Radni setovi sa tegom');

-- Kategorije za Squat (weighted)
INSERT INTO categories (exercise_id, name, value_type, has_weight, description) VALUES
(9, '1RM', 'kg', 1, 'Maksimalan teg za jedno ponavljanje'),
(9, 'Radni setovi', 'reps', 1, 'Radni setovi sa tegom');

-- Primer učesnika (password za sve: 'Test123!')
INSERT INTO users (first_name, last_name, nickname, email, password_hash, role, is_approved) VALUES
('Marko', 'Petrović', 'Mare', 'marko@fitrecords.rs', '$2a$12$LJ3m4ys2Y3lMILqGMmx6aeNz0BiOsFsmHPk6tQwMOgPMkJrc83PV6', 'user', 1),
('Jovan', 'Nikolić', 'Joca', 'jovan@fitrecords.rs', '$2a$12$LJ3m4ys2Y3lMILqGMmx6aeNz0BiOsFsmHPk6tQwMOgPMkJrc83PV6', 'user', 1),
('Ana', 'Đorđević', 'Anči', 'ana@fitrecords.rs', '$2a$12$LJ3m4ys2Y3lMILqGMmx6aeNz0BiOsFsmHPk6tQwMOgPMkJrc83PV6', 'user', 1),
('Milan', 'Cvetković', 'Mikica', 'milan@fitrecords.rs', '$2a$12$LJ3m4ys2Y3lMILqGMmx6aeNz0BiOsFsmHPk6tQwMOgPMkJrc83PV6', 'admin', 1);

-- ============================================
-- 6. FOOD CATALOG (Admin unosi namirnice/jela)
-- ============================================
CREATE TABLE food_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  item_type ENUM('food', 'dish') NOT NULL DEFAULT 'food',
  kcal_per_100g DECIMAL(10,2) NOT NULL,
  protein_per_100g DECIMAL(10,2) NOT NULL,
  carbs_per_100g DECIMAL(10,2) NOT NULL,
  fat_per_100g DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_food_items_name (name),
  INDEX idx_food_items_active (is_active)
) ENGINE=InnoDB;

-- ============================================
-- 7. FOOD ENTRIES (po danu i obroku)
-- ============================================
CREATE TABLE food_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entry_date DATE NOT NULL,
  meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_food_entry_user_day_meal (user_id, entry_date, meal_type),
  INDEX idx_food_entries_user_day (user_id, entry_date),
  INDEX idx_food_entries_meal (meal_type)
) ENGINE=InnoDB;

-- ============================================
-- 8. FOOD ENTRY ITEMS (više stavki po obroku)
-- ============================================
CREATE TABLE food_entry_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  food_item_id INT DEFAULT NULL,
  custom_name VARCHAR(255) DEFAULT NULL,
  amount_grams DECIMAL(10,2) NOT NULL,
  kcal_per_100g DECIMAL(10,2) NOT NULL,
  protein_per_100g DECIMAL(10,2) NOT NULL,
  carbs_per_100g DECIMAL(10,2) NOT NULL,
  fat_per_100g DECIMAL(10,2) NOT NULL,
  consumed_kcal DECIMAL(10,2) NOT NULL,
  consumed_protein DECIMAL(10,2) NOT NULL,
  consumed_carbs DECIMAL(10,2) NOT NULL,
  consumed_fat DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES food_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE SET NULL,
  INDEX idx_food_entry_items_entry (entry_id),
  INDEX idx_food_entry_items_food (food_item_id),
  INDEX idx_food_entry_items_custom_name (custom_name)
) ENGINE=InnoDB;

-- ============================================
-- 9. FOOD DAILY TOTALS (sumarno po danu)
-- ============================================
CREATE TABLE food_daily_totals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entry_date DATE NOT NULL,
  total_kcal DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_protein DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_carbs DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_fat DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_items INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_food_daily_totals_user_day (user_id, entry_date),
  INDEX idx_food_daily_totals_user_day (user_id, entry_date)
) ENGINE=InnoDB;

-- ============================================
-- 10. WEIGHT METRICS (više merenja dnevno)
-- ============================================
CREATE TABLE weight_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  metric_datetime DATETIME NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_weight_metrics_user_datetime (user_id, metric_datetime),
  INDEX idx_weight_metrics_user_date (user_id, metric_datetime, id)
) ENGINE=InnoDB;
