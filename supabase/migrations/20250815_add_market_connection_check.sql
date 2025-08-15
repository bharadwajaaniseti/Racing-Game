-- Function to check animal market connections
CREATE OR REPLACE FUNCTION check_market_connections()
RETURNS TABLE (
    message text,
    details jsonb
) AS $$
BEGIN
    -- Check for animals without market connections
    RETURN QUERY
    SELECT 
        'Animals missing market connection' as message,
        jsonb_agg(jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'current_hunger_rate', a.hunger_rate
        )) as details
    FROM animals a
    WHERE a.market_animal_id IS NULL
    AND a.user_id IS NOT NULL;

    -- Check for animals with incorrect hunger rates
    RETURN QUERY
    SELECT 
        'Animals with mismatched hunger rates' as message,
        jsonb_agg(jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'current_rate', a.hunger_rate,
            'market_rate', ma.hunger_rate
        )) as details
    FROM animals a
    JOIN market_animals ma ON a.market_animal_id = ma.id
    WHERE a.hunger_rate != ma.hunger_rate
    AND a.user_id IS NOT NULL;

    -- Check market templates without hunger rates
    RETURN QUERY
    SELECT 
        'Market templates missing hunger rates' as message,
        jsonb_agg(jsonb_build_object(
            'id', id,
            'name', name
        )) as details
    FROM market_animals
    WHERE hunger_rate IS NULL;
END;
$$ LANGUAGE plpgsql;
