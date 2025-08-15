-- Check if our buy_animal function is actually being used and working correctly
-- Let's test it directly with debugging
SELECT buy_animal('669b5c48-dff9-4097-9ff4-96e94a0800c4');

-- Check what got created
SELECT 
    a.id,
    a.name,
    a.hunger_rate,
    a.market_animal_id,
    ma.hunger_rate as template_hunger_rate,
    ma.name as template_name
FROM animals a
LEFT JOIN market_animals ma ON a.market_animal_id = ma.id
WHERE a.user_id IS NOT NULL
ORDER BY a.created_at DESC
LIMIT 1;
