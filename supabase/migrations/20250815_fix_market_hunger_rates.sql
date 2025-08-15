-- Ensure market animals have hunger rates
UPDATE market_animals 
SET hunger_rate = 20.0  -- Set a default rate
WHERE hunger_rate IS NULL;

-- Add NOT NULL constraint to market_animals if it doesn't exist
ALTER TABLE market_animals
ALTER COLUMN hunger_rate SET NOT NULL;

-- Double check the fix worked
SELECT 
    id,
    name,
    hunger_rate
FROM market_animals 
WHERE id = '4d22623c-87df-4e24-ad0a-8e5dcb773aa2';
