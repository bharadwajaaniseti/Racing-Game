-- Add gold column to profiles table
ALTER TABLE profiles ADD COLUMN gold integer DEFAULT 100 CHECK (gold >= 0);

-- Update all existing profiles to have 100 gold
UPDATE profiles SET gold = 100 WHERE gold IS NULL;
