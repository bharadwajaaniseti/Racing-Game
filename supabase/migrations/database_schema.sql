-- Complete Database Schema for Animal Racing Game
-- Clean schema with working RLS policies

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS market_animals CASCADE;
DROP TABLE IF EXISTS market_items CASCADE;
DROP TABLE IF EXISTS leaderboard CASCADE;
DROP TABLE IF EXISTS race_entries CASCADE;
DROP TABLE IF EXISTS races CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS animals CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create animals table
CREATE TABLE animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'deer',
  speed integer DEFAULT 50 CHECK (speed >= 1 AND speed <= 100),
  acceleration integer DEFAULT 50 CHECK (acceleration >= 1 AND acceleration <= 100),
  stamina integer DEFAULT 50 CHECK (stamina >= 1 AND stamina <= 100),
  temper integer DEFAULT 50 CHECK (temper >= 1 AND temper <= 100),
  experience integer DEFAULT 0,
  level integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory table
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL,
  item_name text NOT NULL,
  quantity integer DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create races table
CREATE TABLE races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  race_type text DEFAULT 'quick_race',
  track_length integer DEFAULT 1000,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'racing', 'completed')),
  winner_id uuid REFERENCES animals(id),
  race_data jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create race_entries table
CREATE TABLE race_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  position integer,
  finish_time numeric,
  distance_covered numeric,
  created_at timestamptz DEFAULT now()
);

-- Create leaderboard table
CREATE TABLE leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  total_races integer DEFAULT 0,
  total_wins integer DEFAULT 0,
  total_podiums integer DEFAULT 0,
  best_time numeric,
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create market_items table
CREATE TABLE market_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  name text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  effect_value integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create market_animals table
CREATE TABLE market_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  name text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  speed integer DEFAULT 50 CHECK (speed >= 1 AND speed <= 100),
  acceleration integer DEFAULT 50 CHECK (acceleration >= 1 AND acceleration <= 100),
  stamina integer DEFAULT 50 CHECK (stamina >= 1 AND stamina <= 100),
  temper integer DEFAULT 50 CHECK (temper >= 1 AND temper <= 100),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_animals ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES (Simple, non-recursive)
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own_profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ANIMALS POLICIES
CREATE POLICY "users_manage_own_animals" ON animals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "anyone_can_view_animals" ON animals
  FOR SELECT TO authenticated
  USING (true);

-- INVENTORY POLICIES
CREATE POLICY "users_manage_own_inventory" ON inventory
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RACES POLICIES
CREATE POLICY "anyone_can_view_races" ON races
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users_can_create_races" ON races
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "race_creators_can_update_races" ON races
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- RACE ENTRIES POLICIES
CREATE POLICY "anyone_can_view_race_entries" ON race_entries
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users_can_join_races" ON race_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- LEADERBOARD POLICIES
CREATE POLICY "anyone_can_view_leaderboard" ON leaderboard
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users_manage_own_leaderboard" ON leaderboard
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- MARKET POLICIES
CREATE POLICY "anyone_can_view_market_items" ON market_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "anyone_can_view_market_animals" ON market_animals
  FOR SELECT TO authenticated
  USING (true);

-- Add indexes for better performance
CREATE INDEX idx_animals_user_id ON animals(user_id);
CREATE INDEX idx_inventory_user_id ON inventory(user_id);
CREATE INDEX idx_races_created_by ON races(created_by);
CREATE INDEX idx_race_entries_race_id ON race_entries(race_id);
CREATE INDEX idx_race_entries_user_id ON race_entries(user_id);
CREATE INDEX idx_leaderboard_points ON leaderboard(points DESC);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animals_updated_at
  BEFORE UPDATE ON animals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    CASE 
      WHEN new.email = 'anisettibharadwaja@gmail.com' THEN true
      ELSE false
    END
  );
  RETURN new;
END;
$$ language plpgsql security definer;

-- Create trigger to automatically create profile for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert your admin profile (for existing user)
INSERT INTO profiles (id, username, is_admin, created_at, updated_at)
SELECT 
  id, 
  'admin',
  true,
  now(),
  now()
FROM auth.users 
WHERE email = 'anisettibharadwaja@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET 
  is_admin = true,
  updated_at = now();

-- Insert some sample market items
INSERT INTO market_items (type, name, description, price, effect_value) VALUES
('food', 'Energy Bar', 'Increases stamina temporarily', 50, 10),
('food', 'Speed Boost', 'Increases speed temporarily', 75, 15),
('training', 'Agility Training', 'Permanently increases acceleration', 200, 5),
('training', 'Endurance Training', 'Permanently increases stamina', 200, 5);

-- Insert some sample market animals
INSERT INTO market_animals (type, name, description, price, speed, acceleration, stamina, temper) VALUES
('deer', 'Swift Deer', 'A fast and agile deer', 500, 70, 60, 50, 40),
('rabbit', 'Racing Rabbit', 'Quick acceleration rabbit', 400, 60, 80, 45, 35),
('horse', 'Thunder Horse', 'Powerful racing horse', 800, 80, 50, 70, 60);

-- Verify the admin profile was created
SELECT p.*, u.email 
FROM profiles p 
JOIN auth.users u ON p.id = u.id 
WHERE u.email = 'anisettibharadwaja@gmail.com';
