-- Fix the hunger rate management system

-- 1. Create the animals_with_hunger view that ManageAnimalHunger component expects
CREATE OR REPLACE VIEW animals_with_hunger AS
SELECT 
    a.id,
    a.name,
    a.hunger_rate,
    ma.hunger_rate as market_hunger_rate,
    a.user_id,
    a.animal_type
FROM animals a
LEFT JOIN market_animals ma ON a.animal_type = ma.animal_type;

-- 2. Grant access to the view
GRANT SELECT ON animals_with_hunger TO authenticated;

-- 3. Make sure RLS allows admin to update animals
DROP POLICY IF EXISTS "Admin can update any animal" ON animals;
CREATE POLICY "Admin can update any animal" ON animals
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    )
);

-- 4. Make sure RLS allows admin to select animals
DROP POLICY IF EXISTS "Admin can view all animals" ON animals;
CREATE POLICY "Admin can view all animals" ON animals
FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    )
);

-- 5. Enable RLS on animals table if not already enabled
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;

-- 6. Test the system by creating a test function that simulates what the admin panel does
CREATE OR REPLACE FUNCTION admin_test_hunger_update(
    p_animal_id UUID,
    p_new_rate DECIMAL
) RETURNS TEXT AS $$
DECLARE
    v_result TEXT;
    v_current_user UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Get current user
    v_current_user := auth.uid();
    
    -- Check if current user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles 
    WHERE id = v_current_user;
    
    IF NOT v_is_admin THEN
        RETURN 'Error: User is not admin';
    END IF;
    
    -- Try to update the animal
    UPDATE animals 
    SET hunger_rate = p_new_rate 
    WHERE id = p_animal_id;
    
    GET DIAGNOSTICS v_result = ROW_COUNT;
    
    IF v_result::INTEGER > 0 THEN
        RETURN 'SUCCESS: Updated ' || v_result || ' animal(s). Check hunger_rate_changes table for notification log.';
    ELSE
        RETURN 'ERROR: No animals updated. Animal may not exist or permission denied.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
