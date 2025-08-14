-- Add coins column to profiles table
ALTER TABLE profiles ADD COLUMN coins integer DEFAULT 100 CHECK (coins >= 0);

-- Update all existing profiles to have 100 coins
UPDATE profiles SET coins = 100 WHERE coins IS NULL;
