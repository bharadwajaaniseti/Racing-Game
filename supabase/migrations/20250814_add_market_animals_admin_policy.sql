-- First, ensure RLS is enabled
ALTER TABLE market_animals ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "admins_can_manage_market_animals" ON market_animals;

-- Add admin policy for market animals
CREATE POLICY "admins_can_manage_market_animals" ON market_animals
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ));

-- Ensure we have a policy for viewing market animals
DROP POLICY IF EXISTS "anyone_can_view_market_animals" ON market_animals;

CREATE POLICY "anyone_can_view_market_animals" ON market_animals
  FOR SELECT TO authenticated
  USING (true);
