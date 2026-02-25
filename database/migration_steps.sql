-- Migration: Step Metrics tracking
-- Tabela za praćenje dnevnih koraka

CREATE TABLE IF NOT EXISTS step_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  step_date DATE NOT NULL,
  step_count INT NOT NULL DEFAULT 0,
  goal INT DEFAULT 10000,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_step_date (user_id, step_date),
  INDEX idx_step_metrics_user_date (user_id, step_date)
) ENGINE=InnoDB;
