-- Test direct INSERT with hunger_rate to see if triggers are overriding it
DO $$
DECLARE
    test_market_id uuid;
    test_hunger_rate numeric;
BEGIN
    -- Get a market animal ID and its hunger rate
    SELECT id, hunger_rate INTO test_market_id, test_hunger_rate
    FROM market_animals
    WHERE name = 'Wolf'
    LIMIT 1;
    
    RAISE NOTICE 'Testing with market_id: %, hunger_rate: %', test_market_id, test_hunger_rate;
    
    -- Direct INSERT to test
    INSERT INTO animals (
        user_id,
        name,
        hunger_rate,
        market_animal_id,
        hunger_level,
        last_fed,
        speed,
        acceleration,
        stamina,
        temper,
        level
    ) VALUES (
        '210ebe44-d524-47ef-8e8d-c3ba71d953ee',
        'Test Wolf',
        test_hunger_rate,  -- Explicit hunger rate
        test_market_id,
        100,
        CURRENT_TIMESTAMP,
        50,
        50,
        50,
        50,
        1
    ) RETURNING id, hunger_rate;
    
END $$;
