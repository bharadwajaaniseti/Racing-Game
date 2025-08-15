-- Test the hunger rate notification system manually

-- First, let's see what's in the market_animals table
SELECT 'Current market_animals data:' as info;
SELECT animal_type, hunger_rate, created_at, updated_at FROM market_animals ORDER BY animal_type;

-- Check if any animals exist
SELECT 'Current animals data:' as info;
SELECT animal_type, COUNT(*) as count, AVG(hunger_rate) as avg_hunger_rate FROM animals GROUP BY animal_type;

-- Check if hunger_rate_changes table has any data
SELECT 'Current hunger_rate_changes data:' as info;
SELECT COUNT(*) as total_changes FROM hunger_rate_changes;

-- Let's try to manually test the market update function
SELECT 'Testing market hunger update:' as info;
SELECT test_market_hunger_update('Dog', 0.8);

-- Check if that created any changes
SELECT 'Changes after test:' as info;
SELECT * FROM hunger_rate_changes ORDER BY created_at DESC LIMIT 5;
