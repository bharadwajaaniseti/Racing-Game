-- Add hunger_restoration column to market_items for food items
ALTER TABLE market_items 
ADD COLUMN hunger_restoration integer DEFAULT 0 CHECK (hunger_restoration >= 0);

-- Update existing food items with proper hunger restoration values
UPDATE market_items 
SET hunger_restoration = 25
WHERE name = 'Lucky Clover' AND type = 'food';

-- Set hunger restoration for other food items based on their effect_value
UPDATE market_items 
SET hunger_restoration = CASE 
    WHEN effect_value <= 5 THEN 20
    WHEN effect_value <= 10 THEN 30
    WHEN effect_value <= 15 THEN 40
    ELSE 50
END
WHERE type = 'food' AND hunger_restoration = 0;
