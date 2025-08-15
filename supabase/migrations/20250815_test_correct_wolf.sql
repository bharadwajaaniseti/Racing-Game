-- Test with correct case-sensitive names
BEGIN;

-- Test INSERT with the correct wolf ID
INSERT INTO animals (
    user_id,
    name,
    type,
    hunger_rate,
    market_animal_id,
    hunger_level,
    last_fed,
    speed,
    acceleration,
    stamina,
    temper,
    level
) VALUES (
    '210ebe44-d524-47ef-8e8d-c3ba71d953ee',
    'Test Wolf Correct',
    'wolf',
    30.0,
    '669b5c48-dff9-4097-9ff4-96e94a0800c4',  -- Correct wolf ID from the table
    100,
    CURRENT_TIMESTAMP,
    50,
    50,
    50,
    50,
    1
);

-- Check what got inserted
SELECT 
    id,
    name,
    hunger_rate,
    market_animal_id,
    (SELECT name FROM market_animals WHERE id = animals.market_animal_id) as template_name
FROM animals 
WHERE name = 'Test Wolf Correct'
ORDER BY created_at DESC 
LIMIT 1;

ROLLBACK;
