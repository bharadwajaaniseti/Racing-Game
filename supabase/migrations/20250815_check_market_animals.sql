-- Check what market animals actually exist
SELECT 
    id,
    name,
    type,
    hunger_rate,
    created_at
FROM market_animals
ORDER BY name;
