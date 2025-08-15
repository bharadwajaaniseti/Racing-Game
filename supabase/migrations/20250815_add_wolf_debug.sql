-- Function to debug Wolf-specific market data
CREATE OR REPLACE FUNCTION debug_wolf_market()
RETURNS TABLE (
    info_type text,
    details jsonb
) AS $$
BEGIN
    -- Show all wolf templates in market
    RETURN QUERY
    SELECT 
        'Available Wolf Templates' as info_type,
        jsonb_agg(jsonb_build_object(
            'id', id,
            'name', name,
            'type', type,
            'hunger_rate', hunger_rate
        )) as details
    FROM market_animals
    WHERE name ILIKE '%wolf%' OR type ILIKE '%wolf%';

    -- Show our specific wolf's details
    RETURN QUERY
    SELECT 
        'Target Wolf Details' as info_type,
        jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'type', a.type,
            'current_rate', a.hunger_rate,
            'market_id', a.market_animal_id
        ) as details
    FROM animals a
    WHERE a.id = 'ee3a7dc2-45cb-4c5f-8923-3fd0a7f89af3';
END;
$$ LANGUAGE plpgsql;
