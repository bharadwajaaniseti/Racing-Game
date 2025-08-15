-- Add hunger-related columns to market_animals table (for admin setup)
ALTER TABLE market_animals
ADD COLUMN IF NOT EXISTS hunger_rate numeric(4,2) DEFAULT 1.0 CHECK (hunger_rate > 0);

-- Add hunger-related columns to animals table (for purchased animals)
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS hunger_level integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_fed timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hunger_rate numeric(4,2) DEFAULT 1.0 CHECK (hunger_rate > 0);

-- Create a function to calculate current hunger level
CREATE OR REPLACE FUNCTION calculate_current_hunger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  minutes_elapsed integer;
  current_hunger integer;
BEGIN
  -- Calculate minutes elapsed since last feeding
  minutes_elapsed := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.last_fed)) / 60;
  
  -- Calculate current hunger based on hunger_rate
  current_hunger := GREATEST(0, NEW.hunger_level - FLOOR(minutes_elapsed * NEW.hunger_rate)::integer);
  
  -- Update the hunger level
  NEW.hunger_level := current_hunger;
  
  -- Update last_fed to current time if hunger was manually increased
  IF NEW.hunger_level > OLD.hunger_level THEN
    NEW.last_fed := CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create a trigger to automatically update hunger level
CREATE OR REPLACE TRIGGER update_hunger_level
  BEFORE UPDATE ON animals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_current_hunger();

-- Function to reset hunger on feeding
-- Function to get current hunger level
CREATE OR REPLACE FUNCTION get_current_hunger(last_fed_time timestamp with time zone, current_hunger integer, hunger_consumption_rate numeric)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  minutes_elapsed integer;
  hunger_decrease numeric;
BEGIN
  minutes_elapsed := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_fed_time)) / 60;
  hunger_decrease := minutes_elapsed * hunger_consumption_rate;
  RETURN GREATEST(0, current_hunger - FLOOR(hunger_decrease)::integer);
END;
$$;

-- Drop the existing view if it exists
DROP VIEW IF EXISTS animals_with_hunger;

-- Create a view that shows animals with their current hunger levels
CREATE VIEW animals_with_hunger AS
SELECT 
  a.*,
  ma.hunger_rate as market_hunger_rate,
  CASE 
    WHEN a.hunger_level IS NOT NULL AND a.last_fed IS NOT NULL THEN
      get_current_hunger(a.last_fed, a.hunger_level, COALESCE(a.hunger_rate, ma.hunger_rate))
    ELSE
      NULL
  END as current_hunger_level
FROM animals a
LEFT JOIN market_animals ma ON a.market_animal_id = ma.id;

-- Function to initialize hunger when animal is purchased
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
    
    -- If this is a market animal being purchased, copy its hunger rate
    IF TG_OP = 'INSERT' AND NEW.market_animal_id IS NOT NULL THEN
      SELECT hunger_rate INTO NEW.hunger_rate
      FROM market_animals
      WHERE id = NEW.market_animal_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to initialize hunger on purchase
CREATE OR REPLACE TRIGGER initialize_hunger_on_purchase
  BEFORE INSERT OR UPDATE OF user_id ON animals
  FOR EACH ROW
  EXECUTE FUNCTION initialize_animal_hunger();

-- Function to feed animal
CREATE OR REPLACE FUNCTION feed_animal(animal_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only feed if the animal has been purchased (has hunger initialized)
  IF EXISTS (
    SELECT 1 FROM animals 
    WHERE id = animal_id 
    AND hunger_level IS NOT NULL 
    AND last_fed IS NOT NULL
  ) THEN
    UPDATE animals
    SET 
      hunger_level = LEAST(100, get_current_hunger(last_fed, hunger_level) + amount),
      last_fed = CURRENT_TIMESTAMP
    WHERE id = animal_id;
  END IF;
END;
$$;
