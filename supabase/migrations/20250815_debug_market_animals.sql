-- Check market animals table
SELECT 
    id,
    name,
    hunger_rate,
    created_at
FROM market_animals 
WHERE name = 'Wolf';
