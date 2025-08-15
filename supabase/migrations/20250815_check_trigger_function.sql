-- Check what the initialize_animal_hunger function is doing
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'initialize_animal_hunger';
