-- Drop and recreate buy_animal function with fixed hunger rate handling
DROP FUNCTION IF EXISTS buy_animal(uuid);

CREATE OR REPLACE FUNCTION buy_animal(p_market_id uuid)
RETURNS void AS $$
DECLARE
    v_market_animal market_animals%ROWTYPE;
    v_user_gold numeric;
BEGIN
    -- Get the market animal and ensure hunger_rate is available
    SELECT * INTO v_market_animal
    FROM market_animals
    WHERE id = p_market_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Animal not found in market';
    END IF;

    -- Validate hunger_rate
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
            hunger_level,
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
            v_market_animal.hunger_rate,  -- Always use market's hunger rate
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

-- Drop old trigger functions
DROP TRIGGER IF EXISTS sync_hunger_rate_trigger ON animals;
DROP TRIGGER IF EXISTS sync_hunger_rate_insert_trigger ON animals;
DROP FUNCTION IF EXISTS sync_hunger_rate();

-- Fix any existing animals to use their market template's hunger rate
UPDATE animals a
SET hunger_rate = ma.hunger_rate
FROM market_animals ma
WHERE a.market_animal_id = ma.id;
