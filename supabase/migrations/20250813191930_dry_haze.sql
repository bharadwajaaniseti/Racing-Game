/*
  # Initial Schema for Animal Racing Game

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `animals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `type` (text, default 'deer')
      - `speed` (integer, default 50)
      - `acceleration` (integer, default 50)
      - `stamina` (integer, default 50)
      - `temper` (integer, default 50)
      - `experience` (integer, default 0)
      - `level` (integer, default 1)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `inventory`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `item_type` (text) -- 'food', 'training'
      - `item_name` (text)
      - `quantity` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `races`
      - `id` (uuid, primary key)
      - `created_by` (uuid, references profiles)
      - `race_type` (text, default 'quick_race')
      - `track_length` (integer, default 1000)
      - `status` (text, default 'waiting') -- 'waiting', 'racing', 'completed'
      - `winner_id` (uuid, references animals)
      - `race_data` (jsonb) -- stores race results and telemetry
      - `created_at` (timestamp)
      - `completed_at` (timestamp)
    
    - `race_entries`
      - `id` (uuid, primary key)
      - `race_id` (uuid, references races)
      - `animal_id` (uuid, references animals)
      - `user_id` (uuid, references profiles)
      - `position` (integer)
      - `finish_time` (numeric)
      - `distance_covered` (numeric)
      - `created_at` (timestamp)
    
    - `leaderboard`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `total_races` (integer, default 0)
      - `total_wins` (integer, default 0)
      - `total_podiums` (integer, default 0)
      - `best_time` (numeric)
      - `points` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage their own data
    - Public read access for leaderboards
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create animals table
CREATE TABLE IF NOT EXISTS animals (
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
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL,
  item_name text NOT NULL,
  quantity integer DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create races table
CREATE TABLE IF NOT EXISTS races (
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
CREATE TABLE IF NOT EXISTS race_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  position integer,
  finish_time numeric,
  distance_covered numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Animals policies
CREATE POLICY "Users can view own animals"
  ON animals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own animals"
  ON animals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own animals"
  ON animals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own animals"
  ON animals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Inventory policies
CREATE POLICY "Users can manage own inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Races policies
CREATE POLICY "Anyone can view races"
  ON races FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create races"
  ON races FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Race creators can update their races"
  ON races FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Race entries policies
CREATE POLICY "Anyone can view race entries"
  ON race_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join races with their animals"
  ON race_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Leaderboard policies
CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own leaderboard entry"
  ON leaderboard FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all data"
  ON profiles FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage all animals"
  ON animals FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage all inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage all races"
  ON races FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage all race entries"
  ON race_entries FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage all leaderboard entries"
  ON leaderboard FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_animals_user_id ON animals(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_races_created_by ON races(created_by);
CREATE INDEX IF NOT EXISTS idx_race_entries_race_id ON race_entries(race_id);
CREATE INDEX IF NOT EXISTS idx_race_entries_user_id ON race_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(points DESC);

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

-- Function to create an admin user
CREATE OR REPLACE FUNCTION create_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_username TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Create the user in auth.users
  user_id := (
    SELECT id FROM auth.users 
    WHERE email = admin_email
    LIMIT 1
  );
  
  IF user_id IS NULL THEN
    user_id := (
      SELECT id FROM auth.users
      WHERE id = (
        INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
        VALUES (
          admin_email,
          crypt(admin_password, gen_salt('bf')),
          now(),
          'authenticated'
        )
        RETURNING id
      )
    );
  END IF;

  -- Create the admin profile
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (user_id, admin_username, true)
  ON CONFLICT (id) DO UPDATE
  SET is_admin = true;

  RETURN user_id;
END;
$$;

-- Create initial admin user
SELECT create_admin_user(
  'admin@animalracing.com',
  'change_this_password_immediately',
  'admin'
);