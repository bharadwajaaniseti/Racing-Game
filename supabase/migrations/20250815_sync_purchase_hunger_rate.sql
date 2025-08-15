-- Drop existing function
DROP FUNCTION IF EXISTS buy_animal(uuid);

-- Create improved buy_animal function that copies hunger_rate
CREATE OR REPLACE FUNCTION buy_animal(p_market_id uuid)
RETURNS void AS $$
DECLARE
    v_market_animal market_animals%ROWTYPE;
    v_user_gold numeric;
    v_hunger_rate numeric;
BEGIN
    -- Get the market animal and ensure hunger_rate is available
    SELECT * INTO v_market_animal
    FROM market_animals
    WHERE id = p_market_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Animal not found in market';
    END IF;

    -- Get and validate hunger_rate
    IF v_market_animal.hunger_rate IS NULL THEN
        RAISE EXCEPTION 'Market animal template is missing hunger rate';
    END IF;

    -- Get user's gold from user_currency
    SELECT gold INTO v_user_gold
    FROM user_currency
    WHERE user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User currency record not found';
    END IF;

    -- Check if user has enough gold
    IF v_user_gold < v_market_animal.price THEN
        RAISE EXCEPTION 'Insufficient gold';
    END IF;

    -- Start transaction to ensure atomicity
    BEGIN
        -- Create the animal for the user with validated hunger_rate
        INSERT INTO animals (
            user_id,
            name,
            type,
            speed,
            acceleration,
            stamina,
            temper,
            level,
            model_url,
            model_scale,
            model_rotation,
            idle_anim,
            run_anim,
            market_animal_id,
            hunger_rate,
            hunger_level,      -- Initialize hunger stats
            last_fed
        ) VALUES (
            auth.uid(),
            v_market_animal.name,
            v_market_animal.type,
            v_market_animal.speed,
            v_market_animal.acceleration,
            v_market_animal.stamina,
            v_market_animal.temper,
            1,
            v_market_animal.model_url,
            v_market_animal.model_scale,
            v_market_animal.model_rotation,
            v_market_animal.idle_anim,
            v_market_animal.run_anim,
            p_market_id,
            COALESCE(v_market_animal.hunger_rate, 20),  -- Set initial hunger rate
            100,                          -- Initial hunger level
            CURRENT_TIMESTAMP             -- Initial last_fed time
        );

        -- Update user's gold
        UPDATE user_currency
        SET gold = gold - v_market_animal.price
        WHERE user_id = auth.uid();

        -- If we get here, both operations succeeded
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            -- If anything fails, roll back both operations
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the specific Wolf's market connection and hunger rate
UPDATE animals a
SET 
    market_animal_id = 'a904ef63-f287-4228-915f-82b569c002a0',
    hunger_rate = 30
WHERE a.id = 'ee3a7dc2-45cb-4c5f-8923-3fd0a7f89af3';

-- Create a trigger to ensure hunger_rate stays in sync with market template
CREATE OR REPLACE FUNCTION sync_hunger_rate()
RETURNS TRIGGER AS $$
DECLARE
    v_market_rate numeric;
BEGIN
    -- For both INSERT and UPDATE, we need to ensure hunger_rate is set
    -- First try to get the market template's hunger rate
    IF NEW.market_animal_id IS NOT NULL THEN
        SELECT hunger_rate INTO v_market_rate
        FROM market_animals
        WHERE id = NEW.market_animal_id;
    END IF;

    -- Set the hunger_rate
    IF v_market_rate IS NOT NULL THEN
        -- Use market template rate if available
        NEW.hunger_rate := v_market_rate;
    ELSE
        -- Default to original value or 20 if NULL
        NEW.hunger_rate := COALESCE(NEW.hunger_rate, 20);
    END IF;

    -- Double check we never return NULL
    IF NEW.hunger_rate IS NULL THEN
        NEW.hunger_rate := 20;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS sync_hunger_rate_trigger ON animals;
DROP TRIGGER IF EXISTS sync_hunger_rate_insert_trigger ON animals;

-- Create triggers for both INSERT and UPDATE
CREATE TRIGGER sync_hunger_rate_insert_trigger
    BEFORE INSERT ON animals
    FOR EACH ROW
    EXECUTE FUNCTION sync_hunger_rate();

CREATE TRIGGER sync_hunger_rate_trigger
    BEFORE UPDATE ON animals
    FOR EACH ROW
    EXECUTE FUNCTION sync_hunger_rate();

-- Update all animals to match their market template rates
UPDATE animals a
SET hunger_rate = ma.hunger_rate
FROM market_animals ma
WHERE a.market_animal_id = ma.id
AND ma.hunger_rate IS NOT NULL;

-- Specifically fix the Deer's hunger rate
UPDATE animals a
SET hunger_rate = ma.hunger_rate
FROM market_animals ma
WHERE a.market_animal_id = ma.id
AND a.name = 'Deer'
AND ma.name = 'Deer';

-- Add NOT NULL constraint to prevent future NULL values
ALTER TABLE animals
ALTER COLUMN hunger_rate SET NOT NULL;

-- For debugging: Show all animals and their rates
CREATE OR REPLACE VIEW animal_hunger_debug AS
SELECT 
    a.id as animal_id,
    a.name as animal_name,
    a.hunger_rate as current_rate,
    ma.hunger_rate as market_rate,
    a.market_animal_id
FROM animals a
LEFT JOIN market_animals ma ON a.market_animal_id = ma.id
WHERE a.user_id IS NOT NULL;
