-- Check if there are any triggers on the animals table that might be interfering
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'animals';

-- Also check what triggers we have
\d+ animals
