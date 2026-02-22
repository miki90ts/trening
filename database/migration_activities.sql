-- ============================================
-- Migracija: Activity modul
-- ============================================

USE fitness_records;

-- ============================================
-- 1) ACTIVITY TYPES (admin upravlja tipovima)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(60) NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_activity_types_name (name),
  INDEX idx_activity_types_active (is_active)
) ENGINE=InnoDB;

-- ============================================
-- 2) ACTIVITIES (trening zapisi korisnika)
-- interne jedinice:
-- distance_meters = metri
-- duration_seconds = sekunde
-- elevation/ascent/descent = metri
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  activity_type_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT DEFAULT NULL,
  performed_at DATETIME NOT NULL,
  distance_meters INT NOT NULL,
  duration_seconds INT NOT NULL,
  avg_pace_seconds_per_km DECIMAL(10,2) DEFAULT NULL,
  avg_heart_rate INT DEFAULT NULL,
  min_heart_rate INT DEFAULT NULL,
  max_heart_rate INT DEFAULT NULL,
  ascent_meters INT DEFAULT NULL,
  descent_meters INT DEFAULT NULL,
  min_elevation_meters INT DEFAULT NULL,
  max_elevation_meters INT DEFAULT NULL,
  calories INT DEFAULT NULL,
  running_cadence_avg INT DEFAULT NULL,
  running_cadence_min INT DEFAULT NULL,
  running_cadence_max INT DEFAULT NULL,
  avg_speed_kmh DECIMAL(7,2) DEFAULT NULL,
  max_speed_kmh DECIMAL(7,2) DEFAULT NULL,
  moving_time_seconds INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_type_id) REFERENCES activity_types(id) ON DELETE RESTRICT,
  INDEX idx_activities_user_date (user_id, performed_at),
  INDEX idx_activities_type (activity_type_id),
  INDEX idx_activities_distance (distance_meters),
  INDEX idx_activities_duration (duration_seconds),
  INDEX idx_activities_pace (avg_pace_seconds_per_km)
) ENGINE=InnoDB;

-- ============================================
-- 3) ACTIVITY SPLITS (segmenti treninga)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_splits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  split_order INT NOT NULL,
  label VARCHAR(180) DEFAULT NULL,
  distance_meters INT NOT NULL,
  duration_seconds INT NOT NULL,
  avg_pace_seconds_per_km DECIMAL(10,2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  UNIQUE KEY uq_activity_split_order (activity_id, split_order),
  INDEX idx_activity_splits_activity (activity_id)
) ENGINE=InnoDB;

-- ============================================
-- 4) DEFAULT ACTIVITY TYPES
-- ============================================
INSERT INTO activity_types (name, code, description, created_by)
SELECT * FROM (
  SELECT 'Trčanje' AS name, 'running' AS code, 'Outdoor running' AS description, NULL AS created_by
  UNION ALL
  SELECT 'Hiking', 'hiking', 'Planinarenje i pešačenje', NULL
  UNION ALL
  SELECT 'Trčanje na traci', 'treadmill_running', 'Treadmill running', NULL
  UNION ALL
  SELECT 'Trail trčanje', 'trail_running', 'Trail running', NULL
  UNION ALL
  SELECT 'Bicikla napolju', 'outdoor_cycling', 'Outdoor cycling', NULL
) seed
WHERE NOT EXISTS (
  SELECT 1 FROM activity_types t WHERE t.code = seed.code
);
