-- Check ALL triggers on animals table again
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'animals'
ORDER BY trigger_name;
