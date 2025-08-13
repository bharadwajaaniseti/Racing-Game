-- User Currency Table Schema
-- This table tracks users' in-game currency/coins

-- Drop existing table if it exists (to handle schema changes)
DROP TABLE IF EXISTS user_currency CASCADE;

-- Create user_currency table
CREATE TABLE user_currency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coins integer DEFAULT 1000 CHECK (coins >= 0),
  gold integer DEFAULT 100 CHECK (gold >= 0),
  gems integer DEFAULT 0 CHECK (gems >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_currency ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_manage_own_currency" ON user_currency;

-- RLS Policies for user_currency
CREATE POLICY "users_manage_own_currency" ON user_currency
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_currency_user_id ON user_currency(user_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_user_currency_updated_at ON user_currency;
CREATE TRIGGER update_user_currency_updated_at
  BEFORE UPDATE ON user_currency
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize user currency when profile is created
CREATE OR REPLACE FUNCTION public.initialize_user_currency()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_currency (user_id, coins, gold, gems)
  VALUES (NEW.id, 1000, 100, 0);
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Trigger to automatically create currency for new profiles
DROP TRIGGER IF EXISTS on_profile_created_initialize_currency ON profiles;
CREATE TRIGGER on_profile_created_initialize_currency
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.initialize_user_currency();

-- Insert currency for existing users (if any)
INSERT INTO user_currency (user_id, coins, gold, gems)
SELECT id, 1000, 100, 0
FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_currency)
ON CONFLICT (user_id) DO NOTHING;

-- Verify currency records
SELECT uc.*, p.username, u.email 
FROM user_currency uc
JOIN profiles p ON uc.user_id = p.id
JOIN auth.users u ON p.id = u.id;
