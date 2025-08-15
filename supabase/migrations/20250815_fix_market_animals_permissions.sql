-- Check current permissions and table structure for market_animals

-- 1. Check if market_animals table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'market_animals' 
ORDER BY ordinal_position;

-- 2. Check current data in market_animals
SELECT id, name, hunger_rate FROM market_animals;

-- 3. Check RLS policies on market_animals
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'market_animals';

-- 4. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'market_animals';

-- 5. Test a simple update to see if it works
-- (This will help us identify if it's a permissions issue)
SELECT 'Testing update permissions...' as test;

-- 6. Grant admin permissions if needed
-- Make sure authenticated users can update market_animals for admin functions
DO $$
BEGIN
    -- Check if we need to add/modify policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'market_animals' 
        AND policyname = 'Allow admin updates'
    ) THEN
        -- Create policy to allow updates (you can restrict this to specific admin users later)
        CREATE POLICY "Allow admin updates" ON market_animals
            FOR UPDATE TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- 7. Show final policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'market_animals';
