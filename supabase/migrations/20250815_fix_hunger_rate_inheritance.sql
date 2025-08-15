-- First, remove the default value from animals table
ALTER TABLE animals 
ALTER COLUMN hunger_rate DROP DEFAULT;

-- Update the animals_with_hunger view to prefer market_animal's hunger rate
DROP VIEW IF EXISTS animals_with_hunger;

CREATE VIEW animals_with_hunger AS
SELECT 
  a.*,
  ma.hunger_rate as market_hunger_rate,
  CASE 
    WHEN a.hunger_level IS NOT NULL AND a.last_fed IS NOT NULL THEN
      get_current_hunger(a.last_fed, a.hunger_level, ma.hunger_rate)
    ELSE
      NULL
  END as current_hunger_level
FROM animals a
LEFT JOIN market_animals ma ON a.market_animal_id = ma.id;

-- Fix existing animals to use their market animal's hunger rate
UPDATE animals a
SET hunger_rate = NULL
WHERE user_id IS NOT NULL;
