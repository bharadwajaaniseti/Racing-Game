-- Test direct INSERT with explicit values to isolate the issue
BEGIN;

-- First, let's see what market animals we have
SELECT id, name, hunger_rate FROM market_animals;

-- Now let's try a direct INSERT with hardcoded values
INSERT INTO animals (
    user_id,
    name,
    type,
    hunger_rate,        -- Explicitly set this to a hardcoded value
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
    'Test Direct Insert',
    'Wolf',
    30.0,              -- Hardcoded hunger rate
    (SELECT id FROM market_animals WHERE name = 'Wolf' LIMIT 1),
    100,
    CURRENT_TIMESTAMP,
    50,
    50,
    50,
    50,
    1
);

-- Check what actually got inserted
SELECT 
    id,
    name,
    hunger_rate,
    market_animal_id
FROM animals 
WHERE name = 'Test Direct Insert'
ORDER BY created_at DESC 
LIMIT 1;

ROLLBACK; -- Don't actually save this test
