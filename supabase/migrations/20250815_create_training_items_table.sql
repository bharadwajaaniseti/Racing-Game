-- Create training_items table
CREATE TABLE IF NOT EXISTS training_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_name TEXT NOT NULL UNIQUE,
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    
    -- Stat boosts
    speed_boost INTEGER DEFAULT 0,
    acceleration_boost INTEGER DEFAULT 0,
    stamina_boost INTEGER DEFAULT 0,
    temper_boost INTEGER DEFAULT 0,
    all_stats_boost INTEGER DEFAULT 0,
    
    -- Training properties
    success_rate DECIMAL DEFAULT 0.8 CHECK (success_rate >= 0 AND success_rate <= 1),
    experience_reward INTEGER DEFAULT 10,
    cooldown_seconds INTEGER DEFAULT 3600,
    
    -- Metadata
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the training items that match your inventory
INSERT INTO training_items (item_name, rarity, speed_boost, acceleration_boost, stamina_boost, temper_boost, all_stats_boost, success_rate, experience_reward, cooldown_seconds, description) VALUES
-- Speed Training Items
('Speed Training Supplement', 'common', 2, 0, 0, 0, 0, 0.80, 10, 3600, 'Build speed and endurance by 2-4 points'),

-- Endurance/Stamina Training Items  
('Endurance Training', 'common', 0, 0, 2, 0, 0, 0.80, 10, 3600, 'Build stamina and endurance by 2-4 points'),

-- Temperament Training Items
('Temperament Training', 'common', 0, 0, 0, 2, 0, 0.80, 10, 3600, 'Improve animal temperament and behavior'),

-- Higher tier items (for future use)
('Sprint Training Kit', 'uncommon', 3, 1, 0, 0, 0, 0.75, 15, 3600, 'Advanced speed training with acceleration benefits'),
('Marathon Training Kit', 'uncommon', 1, 0, 3, 0, 0, 0.75, 15, 3600, 'Intense stamina building program'),
('Behavior Conditioning Kit', 'uncommon', 0, 0, 0, 3, 0, 0.75, 15, 3600, 'Advanced temperament improvement methods'),

-- All-around training items
('All-Around Training Kit', 'rare', 0, 0, 0, 0, 2, 0.70, 20, 7200, 'Balanced training for all stats'),
('Professional Training Kit', 'epic', 0, 0, 0, 0, 3, 0.65, 30, 7200, 'Professional-grade training equipment'),
('Champion Training Kit', 'legendary', 0, 0, 0, 0, 5, 0.60, 50, 10800, 'Elite training regimen for champions')

ON CONFLICT (item_name) DO UPDATE SET
    rarity = EXCLUDED.rarity,
    speed_boost = EXCLUDED.speed_boost,
    acceleration_boost = EXCLUDED.acceleration_boost,
    stamina_boost = EXCLUDED.stamina_boost,
    temper_boost = EXCLUDED.temper_boost,
    all_stats_boost = EXCLUDED.all_stats_boost,
    success_rate = EXCLUDED.success_rate,
    experience_reward = EXCLUDED.experience_reward,
    cooldown_seconds = EXCLUDED.cooldown_seconds,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_training_items_name ON training_items(item_name);
CREATE INDEX IF NOT EXISTS idx_training_items_rarity ON training_items(rarity);
