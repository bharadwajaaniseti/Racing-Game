-- Remove the NOT NULL constraint from animals.hunger_rate temporarily
ALTER TABLE animals 
ALTER COLUMN hunger_rate DROP NOT NULL;

-- Test purchase with debugging
BEGIN;

-- Call buy_animal function to purchase the Deer
SELECT buy_animal('4d22623c-87df-4e24-ad0a-8e5dcb773aa2');

-- Show the newly created animal record
SELECT 
    a.id,
    a.name,
    a.hunger_rate,
    a.market_animal_id,
    ma.hunger_rate as template_hunger_rate
FROM animals a
JOIN market_animals ma ON a.market_animal_id = ma.id
WHERE a.market_animal_id = '4d22623c-87df-4e24-ad0a-8e5dcb773aa2'
ORDER BY a.created_at DESC
LIMIT 1;

COMMIT;
