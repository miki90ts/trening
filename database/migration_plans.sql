-- ============================================
-- Migracija: Workout Plans + Sessions
-- Plan šabloni, zakazivanje i izvršenje treninga
-- ============================================
-- NAPOMENA: Prvo napravi backup baze!
-- mysqldump -u root -p fitness_records > backup_pre_plans.sql
-- ============================================

USE fitness_records;

-- ============================================
-- 1. WORKOUT_PLANS — šablon plana (reusable template)
-- ============================================
CREATE TABLE IF NOT EXISTS workout_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_plans_user (user_id)
) ENGINE=InnoDB;

-- ============================================
-- 2. WORKOUT_PLAN_EXERCISES — vežbe unutar plana (redosled)
-- ============================================
CREATE TABLE IF NOT EXISTS workout_plan_exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  category_id INT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_plan_exercises_plan (plan_id)
) ENGINE=InnoDB;

-- ============================================
-- 3. WORKOUT_PLAN_SETS — planirani setovi po vežbi
-- ============================================
CREATE TABLE IF NOT EXISTS workout_plan_sets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_exercise_id INT NOT NULL,
  set_number INT NOT NULL DEFAULT 1,
  target_reps DECIMAL(10,2) NOT NULL,
  target_weight DECIMAL(10,2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_exercise_id) REFERENCES workout_plan_exercises(id) ON DELETE CASCADE,
  INDEX idx_plan_sets_exercise (plan_exercise_id)
) ENGINE=InnoDB;

-- ============================================
-- 4. WORKOUT_SESSIONS — instanca izvršenja plana na datum
-- ============================================
CREATE TABLE IF NOT EXISTS workout_sessions (
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
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_date (scheduled_date),
  INDEX idx_sessions_status (status)
) ENGINE=InnoDB;

-- ============================================
-- 5. WORKOUT_SESSION_EXERCISES — snapshot vežbi iz plana za sesiju
-- ============================================
CREATE TABLE IF NOT EXISTS workout_session_exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  category_id INT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_session_exercises_session (session_id)
) ENGINE=InnoDB;

-- ============================================
-- 6. WORKOUT_SESSION_SETS — planirano vs urađeno po setu
-- ============================================
CREATE TABLE IF NOT EXISTS workout_session_sets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_exercise_id INT NOT NULL,
  set_number INT NOT NULL DEFAULT 1,
  target_reps DECIMAL(10,2) DEFAULT NULL,
  target_weight DECIMAL(10,2) DEFAULT NULL,
  actual_reps DECIMAL(10,2) DEFAULT NULL,
  actual_weight DECIMAL(10,2) DEFAULT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_exercise_id) REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
  INDEX idx_session_sets_exercise (session_exercise_id)
) ENGINE=InnoDB;

-- ============================================
-- GOTOVO! Proveri:
-- SHOW TABLES LIKE 'workout_%';
-- DESCRIBE workout_plans;
-- DESCRIBE workout_sessions;
-- ============================================
