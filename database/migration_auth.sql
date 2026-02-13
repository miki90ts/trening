-- ============================================
-- MIGRACIJA: Dodavanje autentifikacije
-- Pokrenuti na postojećoj bazi
-- ============================================

USE fitness_records;

-- 1. Dodaj auth kolone u users tabelu
ALTER TABLE users
  ADD COLUMN email VARCHAR(255) NULL UNIQUE AFTER nickname,
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER email,
  ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER password_hash,
  ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 1 AFTER role,
  ADD INDEX idx_users_email (email);

-- 2. Kreiraj refresh_tokens tabelu
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_tokens_user (user_id),
  INDEX idx_refresh_tokens_hash (token_hash)
) ENGINE=InnoDB;

-- 3. RUČNO: Postavi email i password za postojeće korisnike
-- Primer (password 'Test123!' hashovan sa bcrypt 12 rounds):
-- UPDATE users SET email = 'marko@email.com', password_hash = '$2a$12$...hash...' WHERE id = 1;
-- UPDATE users SET email = 'milan@email.com', password_hash = '$2a$12$...hash...', role = 'admin' WHERE id = 4;

-- 4. Posle postavljanja emailova i passworda, učini kolone obaveznim:
-- ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL;
-- ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL;
