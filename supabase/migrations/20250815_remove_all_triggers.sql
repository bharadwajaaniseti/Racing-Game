-- Remove ALL triggers from animals table temporarily
DROP TRIGGER IF EXISTS initialize_hunger_on_purchase ON animals;
DROP TRIGGER IF EXISTS update_animals_updated_at ON animals;
DROP TRIGGER IF EXISTS update_hunger_level ON animals;

-- Drop all related functions
DROP FUNCTION IF EXISTS initialize_animal_hunger();
DROP FUNCTION IF EXISTS calculate_current_hunger();

-- Test purchase without any triggers interfering
-- This will help us isolate if triggers are the problem
