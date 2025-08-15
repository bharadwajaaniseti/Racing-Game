-- Drop the existing view
DROP VIEW IF EXISTS animals_with_hunger;

-- Recreate the view to use market_hunger_rate first
CREATE VIEW animals_with_hunger AS
SELECT 
  a.*,
  ma.hunger_rate as market_hunger_rate,
  CASE 
    WHEN a.hunger_level IS NOT NULL AND a.last_fed IS NOT NULL THEN
      get_current_hunger(a.last_fed, a.hunger_level, ma.hunger_rate)  -- Always use market rate
    ELSE
      NULL
  END as current_hunger_level
FROM animals a
LEFT JOIN market_animals ma ON a.market_animal_id = ma.id;

-- Modify the initialization trigger to NOT set hunger_rate
CREATE OR REPLACE FUNCTION initialize_animal_hunger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only initialize hunger if it's null (new purchase) and has a user_id (not admin created)
  IF NEW.user_id IS NOT NULL AND NEW.hunger_level IS NULL THEN
    -- Set initial hunger level and last fed time
    NEW.hunger_level := 100;
    NEW.last_fed := CURRENT_TIMESTAMP;
    -- We don't set hunger_rate anymore, always use market_animal's rate
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the old trigger and recreate it
DROP TRIGGER IF EXISTS initialize_hunger_on_purchase ON animals;

CREATE TRIGGER initialize_hunger_on_purchase
  BEFORE INSERT OR UPDATE OF user_id ON animals
  FOR EACH ROW
  EXECUTE FUNCTION initialize_animal_hunger();
