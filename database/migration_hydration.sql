-- Migration: Hydration tracking
-- Praćenje unosa tečnosti (voda, čaj, kafa, ostalo)

CREATE TABLE IF NOT EXISTS hydration_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entry_date DATE NOT NULL,
  amount_ml INT NOT NULL DEFAULT 0,
  drink_type ENUM('water','tea','coffee','other') NOT NULL DEFAULT 'water',
  goal_ml INT NOT NULL DEFAULT 2500,
  notes VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_hydration_user_date (user_id, entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
