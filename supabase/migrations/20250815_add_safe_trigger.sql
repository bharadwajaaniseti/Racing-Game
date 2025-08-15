-- Add back only the essential trigger for hunger initialization
-- This one will NOT interfere with hunger_rate
CREATE OR REPLACE FUNCTION initialize_hunger_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set hunger_level and last_fed if they're null and user_id is set
  IF NEW.user_id IS NOT NULL THEN
    IF NEW.hunger_level IS NULL THEN
      NEW.hunger_level := 100;
    END IF;
    IF NEW.last_fed IS NULL THEN
      NEW.last_fed := CURRENT_TIMESTAMP;
    END IF;
    -- Explicitly do NOT touch hunger_rate - let buy_animal function handle it
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER initialize_hunger_stats_trigger
  BEFORE INSERT ON animals
  FOR EACH ROW
  EXECUTE FUNCTION initialize_hunger_stats();
