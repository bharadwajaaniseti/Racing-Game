-- Test the offline notification system
-- This can be run manually to test if the notification system works

-- Example: Insert a test hunger rate change (simulate admin changing rate while user offline)
-- Replace USER_ID and ANIMAL_ID with actual values from your database

/*
-- Test query to insert a fake change (for testing only)
INSERT INTO hunger_rate_changes (
    user_id, 
    animal_id, 
    animal_name, 
    old_hunger_rate, 
    new_hunger_rate,
    changed_by,
    user_notified
) VALUES (
    'your-user-id-here'::uuid,
    'your-animal-id-here'::uuid,
    'Test Deer',
    1.0,
    2.5,
    NULL,
    FALSE  -- This will trigger the notification when user logs in
);

-- Test query to check unnotified changes
SELECT * FROM get_unnotified_hunger_changes('your-user-id-here'::uuid);
*/

-- Query to see all logged hunger rate changes
SELECT 
    animal_name,
    old_hunger_rate,
    new_hunger_rate,
    changed_at,
    user_notified
FROM hunger_rate_changes 
ORDER BY changed_at DESC 
LIMIT 10;
