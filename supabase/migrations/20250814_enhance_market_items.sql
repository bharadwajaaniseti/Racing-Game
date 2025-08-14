-- Add new columns to market_items table
ALTER TABLE market_items
ADD COLUMN duration_seconds int4,
ADD COLUMN cooldown_seconds int4,
ADD COLUMN level_required int4 DEFAULT 1,
ADD COLUMN rarity text DEFAULT 'common',
ADD COLUMN max_stock int4;

-- Update existing items with appropriate values
UPDATE market_items
SET 
    duration_seconds = 
        CASE 
            WHEN type = 'food' THEN 300  -- 5 minutes for food items
            ELSE NULL                    -- NULL for permanent items
        END,
    cooldown_seconds = 
        CASE 
            WHEN type = 'food' THEN 600  -- 10 minutes cooldown for food
            WHEN type = 'training' THEN 86400  -- 24 hours cooldown for training
            ELSE NULL
        END,
    level_required = 
        CASE 
            WHEN type = 'food' THEN 1
            WHEN type = 'training' THEN 5  -- Training requires higher level
            ELSE 1
        END,
    rarity = 
        CASE 
            WHEN effect_value >= 15 THEN 'rare'
            WHEN effect_value >= 10 THEN 'uncommon'
            ELSE 'common'
        END,
    max_stock = 
        CASE 
            WHEN type = 'food' THEN 5     -- Can hold up to 5 food items
            WHEN type = 'training' THEN 1  -- Can only have 1 training item
            ELSE NULL
        END;

-- Add some more variety of items
INSERT INTO market_items (type, name, description, price, effect_value, duration_seconds, cooldown_seconds, level_required, rarity, max_stock)
VALUES
    -- Food items
    ('food', 'Power Carrot', 'Increases acceleration temporarily', 75, 15, 300, 600, 1, 'uncommon', 5),
    ('food', 'Golden Apple', 'Increases all stats temporarily', 150, 10, 300, 1200, 3, 'rare', 3),
    ('food', 'Lucky Clover', 'Small boost to all stats', 25, 5, 300, 300, 1, 'common', 10),
    
    -- Training items
    ('training', 'Mental Training', 'Permanently increases temper', 200, 5, NULL, 86400, 5, 'uncommon', 1),
    ('training', 'Elite Training', 'Permanently increases all stats', 500, 3, NULL, 172800, 10, 'rare', 1),
    
    -- Special items
    ('boost', 'Race Day Boost', 'Significant stat boost during races', 300, 20, 900, 86400, 7, 'rare', 2),
    ('cosmetic', 'Golden Aura', 'Adds a golden glow effect to your animal', 1000, 0, NULL, NULL, 15, 'legendary', 1);

-- Add check constraints
ALTER TABLE market_items
ADD CONSTRAINT valid_type CHECK (type IN ('food', 'training', 'boost', 'cosmetic')),
ADD CONSTRAINT valid_price CHECK (price >= 0),
ADD CONSTRAINT valid_effect_value CHECK (effect_value >= 0),
ADD CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0),
ADD CONSTRAINT valid_cooldown CHECK (cooldown_seconds IS NULL OR cooldown_seconds > 0),
ADD CONSTRAINT valid_level CHECK (level_required > 0),
ADD CONSTRAINT valid_rarity CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'));

-- Add an index for commonly queried columns
CREATE INDEX idx_market_items_type_level ON market_items(type, level_required);
