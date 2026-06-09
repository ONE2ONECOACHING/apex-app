-- Migration : délai de déblocage par module
ALTER TABLE formation_modules ADD COLUMN IF NOT EXISTS unlock_day INT DEFAULT 0;

-- Mettre à jour la formation holistique avec les délais Podia
UPDATE formation_modules SET unlock_day = 0   WHERE titre ILIKE '%commence ici%';
UPDATE formation_modules SET unlock_day = 0   WHERE titre ILIKE '%module 1%';
UPDATE formation_modules SET unlock_day = 15  WHERE titre ILIKE '%module 2%';
UPDATE formation_modules SET unlock_day = 30  WHERE titre ILIKE '%module 3%';
UPDATE formation_modules SET unlock_day = 45  WHERE titre ILIKE '%module 4%';
UPDATE formation_modules SET unlock_day = 60  WHERE titre ILIKE '%module 5%';
UPDATE formation_modules SET unlock_day = 75  WHERE titre ILIKE '%module 6%';
UPDATE formation_modules SET unlock_day = 90  WHERE titre ILIKE '%module 7%';
UPDATE formation_modules SET unlock_day = 105 WHERE titre ILIKE '%module 8%';
UPDATE formation_modules SET unlock_day = 120 WHERE titre ILIKE '%module 9%';
UPDATE formation_modules SET unlock_day = 135 WHERE titre ILIKE '%module 10%';
