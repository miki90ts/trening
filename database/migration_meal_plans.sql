-- ============================================
-- Migracija: Meal Plans + Sessions
-- Plan ishrane šabloni, zakazivanje i praćenje
-- ============================================
-- NAPOMENA: Prvo napravi backup baze!
-- mysqldump -u root -p fitness_records > backup_pre_meal_plans.sql
-- ============================================

USE fitness_records;

-- ============================================
-- 1. MEAL_PLANS — šablon plana ishrane (reusable template)
-- ============================================
CREATE TABLE IF NOT EXISTS meal_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  color VARCHAR(20) DEFAULT '#10b981',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_meal_plans_user (user_id)
) ENGINE=InnoDB;

-- ============================================
-- 2. MEAL_PLAN_MEALS — obroci unutar plana (doručak, ručak, večera, užina)
-- ============================================
CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
  INDEX idx_meal_plan_meals_plan (plan_id)
) ENGINE=InnoDB;

-- ============================================
-- 3. MEAL_PLAN_ITEMS — stavke po obroku (namirnice)
-- ============================================
CREATE TABLE IF NOT EXISTS meal_plan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_meal_id INT NOT NULL,
  food_item_id INT DEFAULT NULL,
  custom_name VARCHAR(255) DEFAULT NULL,
  amount_grams DECIMAL(10,2) NOT NULL DEFAULT 100,
  kcal_per_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
  protein_per_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
  carbs_per_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
  fat_per_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_meal_id) REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE SET NULL,
  INDEX idx_meal_plan_items_meal (plan_meal_id)
) ENGINE=InnoDB;

-- ============================================
-- 4. MEAL_SESSIONS — instanca plana za korisnika na datum
-- ============================================
CREATE TABLE IF NOT EXISTS meal_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT DEFAULT NULL,
  plan_name VARCHAR(255) DEFAULT NULL,
  scheduled_date DATE NOT NULL,
  started_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  status ENUM('scheduled', 'in_progress', 'completed', 'skipped') NOT NULL DEFAULT 'scheduled',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES meal_plans(id) ON DELETE SET NULL,
  INDEX idx_meal_sessions_user (user_id),
  INDEX idx_meal_sessions_date (scheduled_date),
  INDEX idx_meal_sessions_status (status)
) ENGINE=InnoDB;

-- ============================================
-- 5. MEAL_SESSION_MEALS — snapshot obroka iz plana za sesiju
-- ============================================
CREATE TABLE IF NOT EXISTS meal_session_meals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES meal_sessions(id) ON DELETE CASCADE,
  INDEX idx_meal_session_meals_session (session_id)
) ENGINE=InnoDB;

-- ============================================
-- 6. MEAL_SESSION_ITEMS — planirano vs stvarno po stavci
-- ============================================
CREATE TABLE IF NOT EXISTS meal_session_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_meal_id INT NOT NULL,
  food_item_id INT DEFAULT NULL,
  custom_name VARCHAR(255) DEFAULT NULL,
  amount_grams DECIMAL(10,2) NOT NULL DEFAULT 100,
  actual_amount_grams DECIMAL(10,2) DEFAULT NULL,
  kcal_per_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
  protein_per_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
  carbs_per_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
  fat_per_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  is_removed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_meal_id) REFERENCES meal_session_meals(id) ON DELETE CASCADE,
  FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE SET NULL,
  INDEX idx_meal_session_items_meal (session_meal_id)
) ENGINE=InnoDB;

-- ============================================
-- GOTOVO! Proveri:
-- SHOW TABLES LIKE 'meal_%';
-- DESCRIBE meal_plans;
-- DESCRIBE meal_sessions;
-- ============================================
