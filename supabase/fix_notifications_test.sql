-- Fix the hunger notification system by testing each component

-- 1. First, let's create a manual test record to see if notifications work
INSERT INTO hunger_rate_changes (
    user_id, 
    animal_id, 
    animal_name, 
    old_hunger_rate, 
    new_hunger_rate,
    changed_by,
    user_notified
) VALUES (
    '210ebe4d-d524-47cf-8e6d-c3ba7b563ee'::uuid, -- User ID from your animals table
    '0a1f58f2-e1d5-445f-9ce3-7ca8bf9935d3'::uuid, -- Deer animal ID
    'Deer',
    20.0,
    25.5,
    'b0a2050e-5d95-4506-a7bd-28de037b1eed'::uuid, -- Admin user ID
    FALSE
);

-- 2. Test the get_unnotified_hunger_changes function
SELECT * FROM get_unnotified_hunger_changes('210ebe4d-d524-47cf-8e6d-c3ba7b563ee'::uuid);

-- 3. Now let's test the actual update trigger
-- Update the deer's hunger rate to trigger the notification system
UPDATE animals 
SET hunger_rate = 18.0 
WHERE id = '0a1f58f2-e1d5-445f-9ce3-7ca8bf9935d3';

-- 4. Check if the trigger created a new log entry
SELECT * FROM hunger_rate_changes 
WHERE animal_id = '0a1f58f2-e1d5-445f-9ce3-7ca8bf9935d3'
ORDER BY created_at DESC;

-- 5. Check if the animal was actually updated
SELECT id, name, hunger_rate FROM animals 
WHERE id = '0a1f58f2-e1d5-445f-9ce3-7ca8bf9935d3';
