-- Drop the problematic trigger that's interfering with hunger_rate setting
DROP TRIGGER IF EXISTS initialize_hunger_on_purchase ON animals;
DROP FUNCTION IF EXISTS initialize_animal_hunger();

-- Create a simpler trigger that only initializes hunger_level and last_fed
-- but doesn't interfere with hunger_rate
CREATE OR REPLACE FUNCTION initialize_animal_hunger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only initialize hunger if it's null (new purchase) and has a user_id
  IF NEW.user_id IS NOT NULL AND NEW.hunger_level IS NULL THEN
    -- Set initial hunger level and last fed time only
    NEW.hunger_level := 100;
    NEW.last_fed := CURRENT_TIMESTAMP;
    -- DO NOT modify hunger_rate - let the buy_animal function handle it
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER initialize_hunger_on_purchase
  BEFORE INSERT OR UPDATE OF user_id ON animals
  FOR EACH ROW
  EXECUTE FUNCTION initialize_animal_hunger();
