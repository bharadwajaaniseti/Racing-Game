/*
  # Market System Tables

  1. New Tables
    - `market_animals`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text, default 'deer')
      - `speed` (integer)
      - `acceleration` (integer)
      - `stamina` (integer)
      - `temper` (integer)
      - `level` (integer)
      - `price` (integer)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamp)
    
    - `market_items`
      - `id` (uuid, primary key)
      - `type` (text) -- 'food', 'potion', 'currency'
      - `name` (text)
      - `description` (text)
      - `price` (integer)
      - `effect_value` (integer)
      - `created_at` (timestamp)
    
    - `user_currency`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `gold` (integer, default 1000)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for market access
*/

-- Create market_animals table
CREATE TABLE IF NOT EXISTS market_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text DEFAULT 'deer',
  speed integer DEFAULT 50 CHECK (speed >= 1 AND speed <= 100),
  acceleration integer DEFAULT 50 CHECK (acceleration >= 1 AND acceleration <= 100),
  stamina integer DEFAULT 50 CHECK (stamina >= 1 AND stamina <= 100),
  temper integer DEFAULT 50 CHECK (temper >= 1 AND temper <= 100),
  level integer DEFAULT 1,
  price integer DEFAULT 100 CHECK (price > 0),
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create market_items table
CREATE TABLE IF NOT EXISTS market_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('food', 'potion', 'currency')),
  name text NOT NULL,
  description text DEFAULT '',
  price integer DEFAULT 10 CHECK (price > 0),
  effect_value integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create user_currency table
CREATE TABLE IF NOT EXISTS user_currency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  gold integer DEFAULT 1000 CHECK (gold >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE market_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_currency ENABLE ROW LEVEL SECURITY;

-- Market animals policies
CREATE POLICY "Anyone can view market animals"
  ON market_animals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage market animals"
  ON market_animals FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Market items policies
CREATE POLICY "Anyone can view market items"
  ON market_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage market items"
  ON market_items FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- User currency policies
CREATE POLICY "Users can view own currency"
  ON user_currency FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own currency"
  ON user_currency FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own currency"
  ON user_currency FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all currency"
  ON user_currency FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_animals_created_by ON market_animals(created_by);
CREATE INDEX IF NOT EXISTS idx_market_items_type ON market_items(type);
CREATE INDEX IF NOT EXISTS idx_user_currency_user_id ON user_currency(user_id);

-- Add trigger for updated_at on user_currency
CREATE TRIGGER update_user_currency_updated_at
  BEFORE UPDATE ON user_currency
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample market items
INSERT INTO market_items (type, name, description, price, effect_value) VALUES
('food', 'Premium Carrots', 'High-quality carrots that boost stamina significantly', 25, 15),
('food', 'Energy Berries', 'Wild berries that provide quick energy restoration', 15, 10),
('food', 'Protein Pellets', 'Specially formulated pellets for strength building', 35, 20),
('potion', 'Speed Elixir', 'Temporarily increases speed during training', 50, 5),
('potion', 'Stamina Tonic', 'Enhances endurance and recovery', 45, 8),
('potion', 'Focus Serum', 'Improves temperament and focus', 40, 6),
('currency', 'Gold Pouch (Small)', 'Contains 100 gold coins', 5, 100),
('currency', 'Gold Pouch (Medium)', 'Contains 500 gold coins', 20, 500),
('currency', 'Gold Pouch (Large)', 'Contains 1000 gold coins', 35, 1000);

-- Insert some sample market animals (created by admin)
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_id FROM profiles WHERE is_admin = true LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO market_animals (name, speed, acceleration, stamina, temper, level, price, created_by) VALUES
    ('Thunder Strike', 85, 80, 75, 70, 5, 500, admin_id),
    ('Lightning Dash', 90, 85, 70, 65, 6, 750, admin_id),
    ('Storm Runner', 80, 75, 90, 80, 4, 400, admin_id),
    ('Wind Walker', 75, 90, 85, 75, 3, 350, admin_id),
    ('Shadow Bolt', 95, 70, 65, 85, 7, 1000, admin_id);
  END IF;
END $$;