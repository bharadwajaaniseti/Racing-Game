-- List all available market animals
SELECT 
    id,
    name,
    type,
    hunger_rate,
    created_at
FROM market_animals 
ORDER BY name;
