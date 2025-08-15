-- Drop the existing trigger first
DROP TRIGGER IF EXISTS initialize_hunger_on_purchase ON animals;

-- Create an improved initialize function that handles both market_animal_id and hunger_rate
CREATE OR REPLACE FUNCTION initialize_animal_hunger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    market_hunger numeric(4,2);
BEGIN
    -- Only proceed if this is a user's animal (not admin created template)
    IF NEW.user_id IS NOT NULL THEN
        -- If this is a new purchase (hunger_level is null)
        IF NEW.hunger_level IS NULL THEN
            -- Set initial hunger level and last fed time
            NEW.hunger_level := 100;
            NEW.last_fed := CURRENT_TIMESTAMP;
        END IF;

        -- Always try to get and set the market hunger rate when market_animal_id changes
        IF NEW.market_animal_id IS NOT NULL AND 
           (TG_OP = 'INSERT' OR OLD.market_animal_id IS NULL OR OLD.market_animal_id != NEW.market_animal_id) THEN
            -- Get the hunger rate from market_animals
            SELECT hunger_rate INTO market_hunger
            FROM market_animals
            WHERE id = NEW.market_animal_id;

            -- Set the hunger rate
            IF market_hunger IS NOT NULL THEN
                NEW.hunger_rate := market_hunger;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the new trigger that watches for both INSERT and UPDATE
CREATE TRIGGER initialize_hunger_on_purchase
    BEFORE INSERT OR UPDATE ON animals
    FOR EACH ROW
    EXECUTE FUNCTION initialize_animal_hunger();

-- Update existing animals to sync with their market animal hunger rates
UPDATE animals a
SET hunger_rate = ma.hunger_rate
FROM market_animals ma
WHERE a.market_animal_id = ma.id
AND a.user_id IS NOT NULL;
