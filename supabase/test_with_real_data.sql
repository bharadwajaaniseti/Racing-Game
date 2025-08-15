-- Test hunger notification system with actual data
-- First, let's see what animals and users exist

SELECT 'Current animals:' as info;
SELECT id, name, user_id, type, hunger_rate FROM animals LIMIT 5;

SELECT 'Current market animals:' as info;
SELECT animal_type, hunger_rate FROM market_animals LIMIT 5;

-- Insert a test change with valid UUIDs from the animals above
-- Replace these UUIDs with actual ones from your data
INSERT INTO hunger_rate_changes (
    user_id, 
    animal_id, 
    animal_name, 
    old_hunger_rate, 
    new_hunger_rate,
    changed_by,
    user_notified
) VALUES (
    (SELECT user_id FROM animals LIMIT 1), -- Get first user ID
    (SELECT id FROM animals LIMIT 1),      -- Get first animal ID
    (SELECT name FROM animals LIMIT 1),    -- Get first animal name
    20.0,
    15.0,
    'b0a2050e-5d95-4506-a7bd-28de037b1eed'::uuid, -- Admin user ID (your current user)
    FALSE  -- This will trigger the notification when user logs in
);

-- Check if the insert worked
SELECT 'Test change inserted:' as info;
SELECT * FROM hunger_rate_changes ORDER BY created_at DESC LIMIT 1;
