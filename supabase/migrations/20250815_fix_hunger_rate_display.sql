-- Drop the existing view
DROP VIEW IF EXISTS animals_with_hunger;

-- Create or replace the view with proper hunger rate handling
CREATE VIEW animals_with_hunger AS
SELECT 
  a.*,
  ma.hunger_rate as market_hunger_rate,
  COALESCE(a.hunger_rate, ma.hunger_rate, 1.0) as effective_hunger_rate,
  CASE 
    WHEN a.hunger_level IS NOT NULL AND a.last_fed IS NOT NULL THEN
      get_current_hunger(a.last_fed, a.hunger_level, COALESCE(a.hunger_rate, ma.hunger_rate, 1.0))
    ELSE
      NULL
  END as current_hunger_level
FROM animals a
LEFT JOIN market_animals ma ON a.market_animal_id = ma.id;
