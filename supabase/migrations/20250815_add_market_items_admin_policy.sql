-- Enable RLS on market_items table if not already enabled
ALTER TABLE market_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admins_can_manage_market_items" ON market_items;
DROP POLICY IF EXISTS "anyone_can_view_active_market_items" ON market_items;

-- Create policy for admin users to manage market items
CREATE POLICY "admins_can_manage_market_items" ON market_items
  FOR ALL -- This covers INSERT, UPDATE, DELETE, and SELECT
  TO authenticated
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

-- Add policy for all users to view active market items
CREATE POLICY "anyone_can_view_active_market_items" ON market_items
  FOR SELECT
  TO authenticated
  USING (is_active = true);
