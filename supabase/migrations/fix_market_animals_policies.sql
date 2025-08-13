-- Fix RLS policies for market_animals table
-- Add admin policies to allow admins to manage market animals

-- Add admin policies for market_animals
CREATE POLICY "admins_can_manage_market_animals" ON market_animals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Also add a policy for users who created the market animal
CREATE POLICY "creators_can_manage_own_market_animals" ON market_animals
  FOR ALL TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Verify the policies are working
SELECT * FROM market_animals WHERE id = 'ff5de787-cc98-4e5b-825e-3c30658aa4df';
