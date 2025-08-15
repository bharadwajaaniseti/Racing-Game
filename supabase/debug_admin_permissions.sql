-- Debug why hunger rate updates aren't working

-- 1. Check if the animals_with_hunger view exists (used in ManageAnimalHunger component)
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE viewname = 'animals_with_hunger';

-- 2. If view doesn't exist, let's see what's in the animals table
SELECT COUNT(*) as total_animals FROM animals;
SELECT animal_type, COUNT(*) as count FROM animals GROUP BY animal_type;

-- 3. Check RLS policies on animals table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'animals';

-- 4. Check if we can manually update an animal (test admin permissions)
-- First, let's find an animal to test with
SELECT id, name, animal_type, hunger_rate, user_id 
FROM animals 
WHERE animal_type = 'Deer' OR name ILIKE '%deer%'
LIMIT 1;

-- 5. Test if the hunger_rate_changes table is working
INSERT INTO hunger_rate_changes (
    user_id, 
    animal_id, 
    animal_name, 
    old_hunger_rate, 
    new_hunger_rate,
    changed_by,
    change_reason
) VALUES (
    'b0a2050e-5d95-4506-a7bd-28de037b1eed'::uuid,
    gen_random_uuid(),
    'Test Animal',
    1.0,
    2.0,
    'b0a2050e-5d95-4506-a7bd-28de037b1eed'::uuid,
    'Manual test insert'
) RETURNING *;

-- 6. Check if the insert worked
SELECT * FROM hunger_rate_changes WHERE change_reason = 'Manual test insert' ORDER BY created_at DESC LIMIT 1;
