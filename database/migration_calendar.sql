-- ============================================
-- Migracija: Kalendar, Zakazivanje, Boje kategorija
-- ============================================

-- 1. Dodaj color kolonu u categories tabelu
ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT '#6366f1' AFTER description;

-- 2. Seed boje za postojeće kategorije (raznolike boje za bolji vizuelni pregled)
UPDATE categories SET color = '#6366f1' WHERE id = 1;  -- Indigo
UPDATE categories SET color = '#ec4899' WHERE id = 2;  -- Pink
UPDATE categories SET color = '#f59e0b' WHERE id = 3;  -- Amber
UPDATE categories SET color = '#10b981' WHERE id = 4;  -- Emerald
UPDATE categories SET color = '#3b82f6' WHERE id = 5;  -- Blue
UPDATE categories SET color = '#8b5cf6' WHERE id = 6;  -- Violet
UPDATE categories SET color = '#ef4444' WHERE id = 7;  -- Red
UPDATE categories SET color = '#14b8a6' WHERE id = 8;  -- Teal
UPDATE categories SET color = '#f97316' WHERE id = 9;  -- Orange
UPDATE categories SET color = '#06b6d4' WHERE id = 10; -- Cyan
UPDATE categories SET color = '#84cc16' WHERE id = 11; -- Lime
UPDATE categories SET color = '#d946ef' WHERE id = 12; -- Fuchsia
UPDATE categories SET color = '#0ea5e9' WHERE id = 13; -- Sky
UPDATE categories SET color = '#e11d48' WHERE id = 14; -- Rose
UPDATE categories SET color = '#a855f7' WHERE id = 15; -- Purple
