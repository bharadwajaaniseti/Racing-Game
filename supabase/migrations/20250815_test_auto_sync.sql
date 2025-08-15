-- Test the auto-sync functionality by creating sample data

-- First, let's see what market animals we have
SELECT id, name, type, hunger_rate FROM market_animals ORDER BY name;

-- Check if we have any user animals to test with
SELECT id, name, type, hunger_rate, market_animal_id, user_id FROM animals WHERE user_id IS NOT NULL;

-- If no user animals exist, we can create some test ones (uncomment if needed)
/*
-- Create test user animals linked to market animals
INSERT INTO animals (user_id, name, type, speed, acceleration, stamina, temper, level, hunger_rate, hunger_level, last_fed, market_animal_id)
SELECT 
    'test-user-id',
    ma.name || ' Test',
    ma.type,
    ma.speed,
    ma.acceleration,
    ma.stamina,
    ma.temper,
    1,
    ma.hunger_rate,
    100,
    NOW(),
    ma.id
FROM market_animals ma;
*/

-- Test the manual sync function
SELECT 'Testing manual sync function:' as test_step;
SELECT * FROM sync_all_animals_to_market_rates();

-- Show final state
SELECT 
    a.name as animal_name,
    a.hunger_rate as animal_rate,
    ma.hunger_rate as market_rate,
    CASE 
        WHEN a.hunger_rate = ma.hunger_rate THEN 'SYNCED' 
        ELSE 'OUT OF SYNC'
    END as sync_status
FROM animals a
JOIN market_animals ma ON a.market_animal_id = ma.id
WHERE a.user_id IS NOT NULL;
