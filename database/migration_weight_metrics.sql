-- ============================================
-- Migracija: Weight metrics modul
-- ============================================

USE fitness_records;

CREATE TABLE IF NOT EXISTS weight_metrics (
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