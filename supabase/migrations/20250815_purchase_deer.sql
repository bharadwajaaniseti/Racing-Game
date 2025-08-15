-- Begin transaction
BEGIN;

-- Call buy_animal function to purchase the Deer
SELECT buy_animal('4d22623c-87df-4e24-ad0a-8e5dcb773a92');

-- Show the newly created animal record
SELECT 
    a.*,
    ma.name as market_template_name,
    ma.hunger_rate as template_hunger_rate
FROM animals a
JOIN market_animals ma ON a.market_animal_id = ma.id
WHERE a.market_animal_id = '4d22623c-87df-4e24-ad0a-8e5dcb773a92'
  AND a.user_id = '210ebe44-d524-47ef-8e8d-c3ba71d953ee'
ORDER BY a.created_at DESC
LIMIT 1;

COMMIT;
