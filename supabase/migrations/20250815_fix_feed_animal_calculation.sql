-- Fix the feed_animal function to properly calculate current hunger before feeding
DROP FUNCTION IF EXISTS feed_animal(uuid, integer);

CREATE OR REPLACE FUNCTION feed_animal(animal_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_animal RECORD;
    current_hunger_level integer;
BEGIN
    -- Get the animal with its hunger rate
    SELECT a.*, COALESCE(a.hunger_rate, ma.hunger_rate, 1.0) as effective_hunger_rate
    INTO v_animal
    FROM animals a
    LEFT JOIN market_animals ma ON a.market_animal_id = ma.id
    WHERE a.id = animal_id;

    -- Only feed if the animal exists and has hunger initialized
    IF v_animal.id IS NOT NULL AND v_animal.hunger_level IS NOT NULL AND v_animal.last_fed IS NOT NULL THEN
        -- Calculate the current hunger level using the 3-parameter function
        current_hunger_level := get_current_hunger(
            v_animal.last_fed, 
            v_animal.hunger_level, 
            v_animal.effective_hunger_rate
        );
        
        -- Update animal with the new hunger level
        UPDATE animals
        SET 
            hunger_level = LEAST(100, current_hunger_level + amount),
            last_fed = CURRENT_TIMESTAMP
        WHERE id = animal_id;
    END IF;
END;
$$;
