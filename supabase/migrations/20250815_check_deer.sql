-- Check if the Deer exists in market_animals
SELECT 
    id,
    name,
    type,
    hunger_rate,
    created_at
FROM market_animals 
WHERE id = '4d22623c-87df-4e24-ad0a-8e5dcb773a92'
   OR name = 'Deer';
