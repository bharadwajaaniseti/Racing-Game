-- Reset database to basic working schema
-- This removes complex views and functions that may be causing issues

-- Drop problematic views and functions
DROP VIEW IF EXISTS animals_with_hunger CASCADE;

-- Drop all versions of get_current_hunger function
DROP FUNCTION IF EXISTS get_current_hunger(timestamp with time zone, integer, numeric) CASCADE;
DROP FUNCTION IF EXISTS get_current_hunger(timestamp with time zone, integer, decimal) CASCADE;
DROP FUNCTION IF EXISTS get_current_hunger(timestamp, integer, numeric) CASCADE;
DROP FUNCTION IF EXISTS get_current_hunger(timestamp, integer, decimal) CASCADE;

-- Drop all versions of feed_animal function
DROP FUNCTION IF EXISTS feed_animal(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS feed_animal(uuid) CASCADE;

-- Ensure animals table has basic required columns
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS hunger_level INTEGER DEFAULT 100;

ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS hunger_rate DECIMAL(5,2) DEFAULT 1.0;

ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS last_fed TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing animals to have basic hunger data
UPDATE animals 
SET hunger_level = 100, 
    hunger_rate = 1.0, 
    last_fed = NOW() 
WHERE hunger_level IS NULL OR hunger_rate IS NULL OR last_fed IS NULL;

-- Create simple feed_animal function
CREATE OR REPLACE FUNCTION feed_animal(animal_id UUID, amount INTEGER DEFAULT 10)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE animals 
  SET 
    hunger_level = LEAST(100, COALESCE(hunger_level, 0) + amount),
    last_fed = NOW()
  WHERE id = animal_id;
END;
$$;

-- Ensure user_inventory table exists for items
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_name)
);

-- Enable RLS on user_inventory
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate simple ones
DROP POLICY IF EXISTS "Users can view their own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can manage their own inventory" ON user_inventory;

CREATE POLICY "Users can view their own inventory" 
ON user_inventory FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own inventory" 
ON user_inventory FOR ALL 
TO authenticated 
USING (auth.uid() = user_id);

-- Ensure inventory table has proper indexes
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item_name ON user_inventory(item_name);

-- Add some basic starter food items for testing
INSERT INTO market_items (name, type, description, price, effect_value, rarity, is_active)
VALUES 
  ('Carrots', 'food', 'Fresh carrots that restore 15 hunger points', 10, 15, 'common', true),
  ('Premium Hay', 'food', 'High quality hay that restores 25 hunger points', 20, 25, 'uncommon', true),
  ('Energy Pellets', 'food', 'Concentrated food that restores 35 hunger points', 35, 35, 'rare', true)
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  effect_value = EXCLUDED.effect_value,
  rarity = EXCLUDED.rarity,
  is_active = EXCLUDED.is_active;
