-- ============================================
-- Migration: Notification preferences + Notifications
-- ============================================

-- Korisničke preference za obaveštenja po kategoriji
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category ENUM(
    'workout_schedule',
    'workout_plan',
    'meal_plan',
    'nutrition',
    'hydration',
    'sleep',
    'steps',
    'weight',
    'activity'
  ) NOT NULL,
  dashboard_enabled TINYINT(1) NOT NULL DEFAULT 1,
  bell_enabled TINYINT(1) NOT NULL DEFAULT 1,
  email_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_user_category (user_id, category),
  CONSTRAINT fk_notif_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Istorija notifikacija (bell dropdown)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category ENUM(
    'workout_schedule',
    'workout_plan',
    'meal_plan',
    'nutrition',
    'hydration',
    'sleep',
    'steps',
    'weight',
    'activity'
  ) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  icon VARCHAR(10) DEFAULT '🔔',
  color VARCHAR(20) DEFAULT '#6366f1',
  link VARCHAR(255) DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user_read (user_id, is_read, created_at DESC),
  INDEX idx_notif_user_date (user_id, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
