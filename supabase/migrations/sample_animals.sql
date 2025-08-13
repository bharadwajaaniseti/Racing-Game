-- Sample Animals for Testing Admin Panel
-- This will create some test animals to display in the admin panel

-- Add admin policy for animals (to ensure admins can manage all animals)
DROP POLICY IF EXISTS "admins_manage_all_animals" ON animals;
CREATE POLICY "admins_manage_all_animals" ON animals
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

-- Insert some sample animals for testing
-- First, we need to ensure we have some user profiles to assign animals to
INSERT INTO animals (user_id, name, type, speed, acceleration, stamina, temper, experience, level)
SELECT 
  p.id,
  'Sample ' || animal_data.type || ' ' || animal_data.num,
  animal_data.type,
  animal_data.speed,
  animal_data.acceleration,
  animal_data.stamina,
  animal_data.temper,
  animal_data.experience,
  animal_data.level
FROM profiles p
CROSS JOIN (
  VALUES 
    ('deer', 1, 70, 65, 60, 45, 150, 2),
    ('rabbit', 2, 60, 80, 50, 40, 200, 3),
    ('horse', 3, 85, 55, 75, 65, 300, 4),
    ('deer', 4, 75, 70, 55, 50, 100, 2),
    ('rabbit', 5, 65, 85, 45, 35, 250, 3)
) AS animal_data(type, num, speed, acceleration, stamina, temper, experience, level)
WHERE p.is_admin = true
LIMIT 5; -- Only create 5 sample animals

-- Also create some animals for regular users (if any exist)
INSERT INTO animals (user_id, name, type, speed, acceleration, stamina, temper, experience, level)
SELECT 
  p.id,
  'User ' || animal_data.type || ' ' || animal_data.num,
  animal_data.type,
  animal_data.speed,
  animal_data.acceleration,
  animal_data.stamina,
  animal_data.temper,
  animal_data.experience,
  animal_data.level
FROM profiles p
CROSS JOIN (
  VALUES 
    ('deer', 1, 50, 50, 50, 50, 0, 1),
    ('rabbit', 2, 55, 60, 45, 45, 50, 1)
) AS animal_data(type, num, speed, acceleration, stamina, temper, experience, level)
WHERE p.is_admin = false
LIMIT 2; -- Create 2 animals per regular user

-- Verify animals were created
SELECT 
  a.id,
  a.name,
  a.type,
  a.speed,
  a.acceleration,
  a.stamina,
  a.temper,
  a.level,
  p.username as owner,
  p.is_admin
FROM animals a
JOIN profiles p ON a.user_id = p.id
ORDER BY p.is_admin DESC, a.created_at;
