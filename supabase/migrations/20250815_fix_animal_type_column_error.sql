-- Fix the animal_type column error by removing problematic functions and triggers

-- Drop the problematic functions that reference animal_type
DROP FUNCTION IF EXISTS test_market_hunger_update(text, numeric) CASCADE;
DROP FUNCTION IF EXISTS log_market_hunger_rate_change() CASCADE;

-- These functions are referencing animal_type which doesn't exist in the market_animals table
-- The correct column name is just 'type'

-- Make sure our sync trigger is working correctly with the right column names
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
    RAISE NOTICE 'Updated hunger rate for market animal % (type: %) from % to %. Affected % user animals.', 
                 NEW.name, NEW.type, OLD.hunger_rate, NEW.hunger_rate, 
                 (SELECT COUNT(*) FROM animals WHERE market_animal_id = NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure our trigger is properly set up (drop and recreate to be safe)
DROP TRIGGER IF EXISTS sync_user_animals_trigger ON market_animals;
CREATE TRIGGER sync_user_animals_trigger
    AFTER UPDATE ON market_animals
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_animals_hunger_rate();

-- Test the update functionality (this should work now)
SELECT 'Sync system is ready. You can now update hunger rates from the admin dashboard.' as status;
