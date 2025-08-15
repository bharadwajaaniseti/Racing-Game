-- Add automatic sync of hunger rates from market animals to user animals
-- This ensures when admin updates market animal hunger rates, all existing user animals get updated too

-- Create function to sync all user animals when market animal is updated
CREATE OR REPLACE FUNCTION sync_user_animals_hunger_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if hunger_rate was actually changed
  IF OLD.hunger_rate IS DISTINCT FROM NEW.hunger_rate THEN
    -- Update all user animals of this market animal type
    UPDATE animals 
    SET hunger_rate = NEW.hunger_rate
    WHERE market_animal_id = NEW.id;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated hunger rate for market animal % from % to %. Affected % user animals.', 
                 NEW.name, OLD.hunger_rate, NEW.hunger_rate, 
                 (SELECT COUNT(*) FROM animals WHERE market_animal_id = NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on market_animals table
DROP TRIGGER IF EXISTS sync_user_animals_trigger ON market_animals;
CREATE TRIGGER sync_user_animals_trigger
    AFTER UPDATE ON market_animals
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_animals_hunger_rate();

-- Also create a function to manually sync all animals (useful for admin)
CREATE OR REPLACE FUNCTION sync_all_animals_to_market_rates()
RETURNS TABLE(
  market_animal_name TEXT,
  animals_updated INTEGER,
  new_hunger_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH updates AS (
    UPDATE animals a
    SET hunger_rate = ma.hunger_rate
    FROM market_animals ma
    WHERE a.market_animal_id = ma.id
    AND a.hunger_rate != ma.hunger_rate  -- Only update if different
    RETURNING ma.name, ma.hunger_rate
  ),
  counts AS (
    SELECT 
      updates.name,
      updates.hunger_rate,
      COUNT(*) as updated_count
    FROM updates
    GROUP BY updates.name, updates.hunger_rate
  )
  SELECT 
    counts.name::TEXT,
    counts.updated_count::INTEGER,
    counts.hunger_rate
  FROM counts;
END;
$$ LANGUAGE plpgsql;

-- Ensure all existing animals are linked to market animals properly
-- First, let's make sure we have the market_animal_id set correctly
UPDATE animals a
SET market_animal_id = ma.id
FROM market_animals ma
WHERE a.market_animal_id IS NULL
AND LOWER(a.name) = LOWER(ma.name)
AND LOWER(a.type) = LOWER(ma.type);

-- Now sync all existing animals to their market rates
SELECT * FROM sync_all_animals_to_market_rates();
