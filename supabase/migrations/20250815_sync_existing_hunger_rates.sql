-- One-time function to sync all existing animals with their market hunger rates
CREATE OR REPLACE FUNCTION sync_all_existing_hunger_rates()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update all purchased animals with their corresponding market animal hunger rates
    UPDATE animals a
    SET hunger_rate = ma.hunger_rate
    FROM market_animals ma
    WHERE a.market_animal_id = ma.id;

    -- Create notifications for all affected users
    INSERT INTO notifications (user_id, title, message)
    SELECT DISTINCT
        a.user_id,
        'Animal Hunger Rate Updated',
        format('Your %s''s hunger rate has been updated to %s per minute', ma.name, ma.hunger_rate)
    FROM animals a
    JOIN market_animals ma ON a.market_animal_id = ma.id
    WHERE a.user_id IS NOT NULL;
END;
$$;

-- Execute the sync function
SELECT sync_all_existing_hunger_rates();

-- Drop the function after use (optional)
DROP FUNCTION sync_all_existing_hunger_rates();
