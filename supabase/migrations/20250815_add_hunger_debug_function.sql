-- Function to diagnose hunger rate issues
CREATE OR REPLACE FUNCTION debug_animal_hunger(p_animal_id uuid)
RETURNS TABLE (
    field_name text,
    value text
) AS $$
BEGIN
    RETURN QUERY
    WITH animal_data AS (
        SELECT 
            a.id,
            a.name,
            a.hunger_rate,
            a.market_animal_id,
            a.user_id,
            ma.hunger_rate as market_hunger_rate,
            ma.name as market_name
        FROM animals a
        LEFT JOIN market_animals ma ON a.market_animal_id = ma.id
        WHERE a.id = p_animal_id
    )
    SELECT 'Animal ID' as field_name, id::text as value FROM animal_data
    UNION ALL SELECT 'Animal Name', name FROM animal_data
    UNION ALL SELECT 'Current Hunger Rate', hunger_rate::text FROM animal_data
    UNION ALL SELECT 'Market Animal ID', market_animal_id::text FROM animal_data
    UNION ALL SELECT 'Market Animal Name', market_name FROM animal_data
    UNION ALL SELECT 'Market Hunger Rate', market_hunger_rate::text FROM animal_data
    UNION ALL SELECT 'User ID', user_id::text FROM animal_data;
END;
$$ LANGUAGE plpgsql;
