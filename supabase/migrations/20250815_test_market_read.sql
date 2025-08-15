-- Simple test to verify the market animal has hunger_rate and our function can read it
DO $$
DECLARE
    v_market_animal market_animals%ROWTYPE;
    v_market_id uuid;
BEGIN
    -- Get a market animal
    SELECT id INTO v_market_id FROM market_animals WHERE name = 'Wolf' LIMIT 1;
    
    -- Get the full record
    SELECT * INTO v_market_animal FROM market_animals WHERE id = v_market_id;
    
    RAISE NOTICE 'Market animal ID: %', v_market_id;
    RAISE NOTICE 'Market animal hunger_rate: %', v_market_animal.hunger_rate;
    RAISE NOTICE 'Market animal name: %', v_market_animal.name;
END $$;
