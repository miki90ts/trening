-- ============================================
-- Migracija: Nutrition tracking modul
-- ============================================

USE fitness_records;

-- ============================================
-- 1) FOOD CATALOG (admin upravlja)
-- ============================================
CREATE TABLE IF NOT EXISTS food_items (
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
-- 2) DAILY MEAL ENTRIES (po korisniku i obroku)
-- ============================================
CREATE TABLE IF NOT EXISTS food_entries (
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
-- 3) ENTRY ITEMS (više stavki po obroku)
--    Ako je food_item_id NULL => custom unos
-- ============================================
CREATE TABLE IF NOT EXISTS food_entry_items (
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
-- 4) DAILY TOTALS (materialized summary)
-- ============================================
CREATE TABLE IF NOT EXISTS food_daily_totals (
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
-- 5) SEED FOOD CATALOG (130+ stavki)
-- Napomena: pokrenuti jednom na praznijem katalogu
-- ============================================
INSERT INTO food_items (
  name,
  item_type,
  kcal_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  created_by
) VALUES
-- MESO / RIBA / JAJA
('Pileći file', 'food', 120, 23.1, 0, 2.6, NULL),
('Pileći batak bez kože', 'food', 175, 26.0, 0, 7.7, NULL),
('Ćureći file', 'food', 114, 24.0, 0, 1.5, NULL),
('Juneći but', 'food', 187, 26.0, 0, 9.0, NULL),
('Teletina', 'food', 172, 24.5, 0, 7.2, NULL),
('Svinjski file', 'food', 143, 21.0, 0, 6.0, NULL),
('Svinjski vrat', 'food', 242, 19.0, 0, 18.0, NULL),
('Svinjski kare', 'food', 190, 21.0, 0, 12.0, NULL),
('Jagnjetina', 'food', 250, 18.0, 0, 20.0, NULL),
('Teleća džigerica', 'food', 175, 26.0, 4.0, 6.0, NULL),
('Pileća džigerica', 'food', 167, 24.0, 1.5, 6.5, NULL),
('Tuna u vodi', 'food', 116, 26.0, 0, 1.0, NULL),
('Tuna u ulju', 'food', 198, 24.0, 0, 10.0, NULL),
('Losos', 'food', 208, 20.0, 0, 13.0, NULL),
('Pastrmka', 'food', 190, 22.0, 0, 11.0, NULL),
('Skuša', 'food', 205, 19.0, 0, 14.0, NULL),
('Oslić', 'food', 90, 19.0, 0, 1.5, NULL),
('Sardina', 'food', 208, 25.0, 0, 11.0, NULL),
('Brancin', 'food', 124, 22.0, 0, 3.5, NULL),
('Orada', 'food', 121, 20.0, 0, 4.0, NULL),
('Lignje', 'food', 92, 16.0, 3.0, 1.5, NULL),
('Škampi', 'food', 99, 24.0, 0.2, 0.3, NULL),
('Dagnje', 'food', 86, 12.0, 3.7, 2.2, NULL),
('Bela riba mix', 'food', 96, 20.0, 0, 1.8, NULL),
('Suva govedina', 'food', 250, 33.0, 0, 12.0, NULL),
('Pileća prsa dimljena', 'food', 115, 21.0, 1.0, 2.5, NULL),
('Pršuta', 'food', 270, 26.0, 0.3, 18.0, NULL),
('Šunka pileća', 'food', 110, 19.0, 2.0, 2.0, NULL),
('Jaje celo', 'food', 143, 12.6, 0.7, 9.5, NULL),
('Belance', 'food', 52, 11.0, 0.7, 0.2, NULL),
('Žumance', 'food', 322, 16.0, 3.6, 27.0, NULL),
('Ćevapi (meso)', 'food', 280, 17.0, 2.0, 23.0, NULL),

-- MLEČNI PROIZVODI
('Mleko 2.8%', 'food', 60, 3.2, 4.8, 2.8, NULL),
('Mleko 1.5%', 'food', 47, 3.3, 4.9, 1.5, NULL),
('Mleko bez laktoze 2.8%', 'food', 60, 3.2, 4.8, 2.8, NULL),
('Jogurt 2.8%', 'food', 62, 3.5, 4.7, 3.0, NULL),
('Jogurt 1.5%', 'food', 50, 3.8, 4.8, 1.5, NULL),
('Grčki jogurt 5%', 'food', 97, 9.0, 3.6, 5.0, NULL),
('Grčki jogurt 2%', 'food', 73, 10.0, 3.5, 2.0, NULL),
('Kefir', 'food', 64, 3.4, 4.7, 3.5, NULL),
('Kiselo mleko', 'food', 63, 3.3, 4.5, 3.6, NULL),
('Posni sir', 'food', 98, 12.0, 3.0, 4.0, NULL),
('Cottage sir', 'food', 98, 11.0, 3.4, 4.3, NULL),
('Mladi sir', 'food', 250, 14.0, 3.0, 20.0, NULL),
('Feta sir', 'food', 265, 14.0, 4.0, 21.0, NULL),
('Mozzarella', 'food', 280, 22.0, 2.2, 20.0, NULL),
('Gauda', 'food', 356, 25.0, 2.2, 27.0, NULL),
('Cheddar', 'food', 402, 25.0, 1.3, 33.0, NULL),
('Parmezan', 'food', 431, 38.0, 4.1, 29.0, NULL),
('Pavlaka 20%', 'food', 206, 2.8, 3.6, 20.0, NULL),
('Maslac', 'food', 717, 0.9, 0.1, 81.0, NULL),
('Whey protein koncentrat', 'food', 390, 76.0, 8.0, 6.0, NULL),

-- VOĆE
('Banana', 'food', 89, 1.1, 22.8, 0.3, NULL),
('Jabuka', 'food', 52, 0.3, 13.8, 0.2, NULL),
('Kruška', 'food', 57, 0.4, 15.0, 0.1, NULL),
('Pomorandža', 'food', 47, 0.9, 11.8, 0.1, NULL),
('Mandarina', 'food', 53, 0.8, 13.3, 0.3, NULL),
('Grejpfrut', 'food', 42, 0.8, 10.7, 0.1, NULL),
('Kivi', 'food', 61, 1.1, 14.7, 0.5, NULL),
('Ananas', 'food', 50, 0.5, 13.1, 0.1, NULL),
('Mango', 'food', 60, 0.8, 15.0, 0.4, NULL),
('Grožđe', 'food', 69, 0.7, 18.1, 0.2, NULL),
('Jagode', 'food', 32, 0.7, 7.7, 0.3, NULL),
('Borovnice', 'food', 57, 0.7, 14.5, 0.3, NULL),
('Maline', 'food', 52, 1.2, 11.9, 0.7, NULL),
('Kupine', 'food', 43, 1.4, 10.2, 0.5, NULL),
('Lubenica', 'food', 30, 0.6, 7.6, 0.2, NULL),
('Dinja', 'food', 34, 0.8, 8.2, 0.2, NULL),
('Breskva', 'food', 39, 0.9, 9.5, 0.3, NULL),
('Kajsija', 'food', 48, 1.4, 11.1, 0.4, NULL),
('Šljiva', 'food', 46, 0.7, 11.4, 0.3, NULL),
('Trešnja', 'food', 50, 1.0, 12.2, 0.3, NULL),
('Nar', 'food', 83, 1.7, 18.7, 1.2, NULL),
('Limun', 'food', 29, 1.1, 9.3, 0.3, NULL),
('Avokado', 'food', 160, 2.0, 8.5, 14.7, NULL),
('Suve urme', 'food', 282, 2.5, 75.0, 0.4, NULL),

-- POVRĆE
('Brokoli', 'food', 34, 2.8, 6.6, 0.4, NULL),
('Karfiol', 'food', 25, 1.9, 5.0, 0.3, NULL),
('Spanać', 'food', 23, 2.9, 3.6, 0.4, NULL),
('Zelena salata', 'food', 15, 1.4, 2.9, 0.2, NULL),
('Paradajz', 'food', 18, 0.9, 3.9, 0.2, NULL),
('Krastavac', 'food', 15, 0.7, 3.6, 0.1, NULL),
('Paprika crvena', 'food', 31, 1.0, 6.0, 0.3, NULL),
('Paprika zelena', 'food', 20, 0.9, 4.6, 0.2, NULL),
('Šargarepa', 'food', 41, 0.9, 9.6, 0.2, NULL),
('Crni luk', 'food', 40, 1.1, 9.3, 0.1, NULL),
('Beli luk', 'food', 149, 6.4, 33.1, 0.5, NULL),
('Tikvica', 'food', 17, 1.2, 3.1, 0.3, NULL),
('Plavi patlidžan', 'food', 25, 1.0, 5.9, 0.2, NULL),
('Kupus', 'food', 25, 1.3, 5.8, 0.1, NULL),
('Kelј', 'food', 35, 2.9, 4.4, 1.5, NULL),
('Cvekla', 'food', 43, 1.6, 9.6, 0.2, NULL),
('Grašak', 'food', 81, 5.4, 14.5, 0.4, NULL),
('Boranija', 'food', 31, 1.8, 7.0, 0.1, NULL),
('Kukuruz šećerac', 'food', 86, 3.3, 19.0, 1.4, NULL),
('Krompir', 'food', 77, 2.0, 17.0, 0.1, NULL),
('Batat', 'food', 86, 1.6, 20.1, 0.1, NULL),
('Pečurke', 'food', 22, 3.1, 3.3, 0.3, NULL),
('Celer', 'food', 16, 0.7, 3.0, 0.2, NULL),
('Bundeva', 'food', 26, 1.0, 6.5, 0.1, NULL),

-- SOKOVI / NAPICI
('Sok od pomorandže 100%', 'food', 45, 0.7, 10.4, 0.2, NULL),
('Sok od jabuke 100%', 'food', 46, 0.1, 11.3, 0.1, NULL),
('Sok od grožđa 100%', 'food', 60, 0.3, 14.8, 0.1, NULL),
('Sok multivitamin', 'food', 50, 0.4, 12.0, 0.1, NULL),
('Sok od ananasa', 'food', 53, 0.3, 12.9, 0.1, NULL),
('Sok od šargarepe', 'food', 40, 0.9, 9.3, 0.2, NULL),
('Sok od paradajza', 'food', 17, 0.9, 3.5, 0.2, NULL),
('Sok od cvekle', 'food', 43, 1.6, 9.6, 0.1, NULL),
('Limunada sa šećerom', 'food', 38, 0.0, 9.5, 0.0, NULL),
('Kola napitak', 'food', 42, 0.0, 10.6, 0.0, NULL),
('Kola zero', 'food', 0, 0.0, 0.0, 0.0, NULL),
('Energetski napitak', 'food', 45, 0.0, 11.0, 0.0, NULL),

-- CELA JELA (dish)
('Sendvič sa tunjevinom', 'dish', 185, 12.0, 18.0, 8.0, NULL),
('Piletina i pirinač', 'dish', 165, 14.0, 18.0, 4.0, NULL),
('Ćuretina i povrće', 'dish', 130, 15.0, 7.0, 4.0, NULL),
('Govedji gulaš', 'dish', 145, 12.0, 6.0, 8.0, NULL),
('Sarma', 'dish', 150, 8.0, 10.0, 8.0, NULL),
('Pasulj sa mesom', 'dish', 140, 9.0, 15.0, 5.0, NULL),
('Musaka', 'dish', 165, 8.0, 12.0, 9.0, NULL),
('Špagete bolonjeze', 'dish', 160, 7.5, 20.0, 5.0, NULL),
('Pica capricciosa', 'dish', 260, 11.0, 30.0, 10.0, NULL),
('Pljeskavica u lepinji', 'dish', 280, 14.0, 22.0, 15.0, NULL),
('Ćevapi u lepinji', 'dish', 290, 13.0, 24.0, 16.0, NULL),
('Burek sa sirom', 'dish', 320, 9.0, 28.0, 19.0, NULL),
('Ovsena kaša sa mlekom', 'dish', 110, 4.5, 16.0, 3.0, NULL),
('Omlet sa sirom', 'dish', 210, 14.0, 2.0, 16.0, NULL),
('Cezar salata sa piletinom', 'dish', 170, 11.0, 6.0, 12.0, NULL),
('Grčka salata', 'dish', 120, 4.0, 6.0, 9.0, NULL),
('Pileća tortilla wrap', 'dish', 210, 12.0, 20.0, 8.0, NULL),
('Proteinske palačinke', 'dish', 190, 13.0, 18.0, 7.0, NULL),
('Smoothie banana whey', 'dish', 125, 8.0, 18.0, 2.5, NULL),
('Palenta sa sirom', 'dish', 165, 5.0, 21.0, 6.0, NULL);
