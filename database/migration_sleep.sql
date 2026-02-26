-- Migration: Sleep Tracking
-- Praćenje spavanja (faze sna, HR, HRV, kvalitet, streak)

CREATE TABLE IF NOT EXISTS sleep_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sleep_date DATE NOT NULL,
  bedtime TIME DEFAULT NULL,
  wake_time TIME DEFAULT NULL,
  duration_min INT DEFAULT NULL,
  -- Sleep phases (minutes)
  awake_min INT DEFAULT NULL,
  rem_min INT DEFAULT NULL,
  light_min INT DEFAULT NULL,
  deep_min INT DEFAULT NULL,
  -- Quality & biometrics
  sleep_quality DECIMAL(5,2) DEFAULT NULL,
  avg_hr INT DEFAULT NULL,
  min_hr INT DEFAULT NULL,
  avg_hrv INT DEFAULT NULL,
  -- Target
  target_min INT DEFAULT 480,
  -- Notes
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_sleep_date (user_id, sleep_date),
  INDEX idx_sleep_user_date (user_id, sleep_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
