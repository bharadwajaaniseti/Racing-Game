-- Check if there are any triggers on market_animals that might be causing the issue
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'market_animals';

-- Also check if there are any views or functions that reference animal_type
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%animal_type%';

-- Check for any views that might reference animal_type
SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE view_definition LIKE '%animal_type%';
