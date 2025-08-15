-- Add specific training items for each stat
-- Remove old generic training items and add specialized ones

DELETE FROM market_items WHERE type = 'training';

INSERT INTO market_items (type, name, description, price, effect_value, duration_seconds, cooldown_seconds, level_required, rarity, max_stock, is_active)
VALUES
    -- Speed Training Items
    ('training', 'Speed Training Kit', 'Focused training to improve speed by 2-4 points', 150, 3, NULL, 1800, 1, 'common', 5, true),
    ('training', 'Advanced Speed Training', 'Professional speed training with guaranteed 4-6 point gain', 300, 5, NULL, 3600, 3, 'uncommon', 3, true),
    ('training', 'Elite Sprint Training', 'Elite training program for maximum speed gains (6-8 points)', 500, 7, NULL, 7200, 5, 'rare', 2, true),
    
    -- Acceleration Training Items
    ('training', 'Acceleration Drills', 'Quick start training to improve acceleration by 2-4 points', 150, 3, NULL, 1800, 1, 'common', 5, true),
    ('training', 'Advanced Acceleration Training', 'Professional acceleration training (4-6 points)', 300, 5, NULL, 3600, 3, 'uncommon', 3, true),
    ('training', 'Elite Burst Training', 'Elite acceleration training for explosive starts (6-8 points)', 500, 7, NULL, 7200, 5, 'rare', 2, true),
    
    -- Stamina Training Items
    ('training', 'Endurance Training', 'Build stamina and endurance by 2-4 points', 150, 3, NULL, 1800, 1, 'common', 5, true),
    ('training', 'Advanced Endurance Training', 'Professional stamina building program (4-6 points)', 300, 5, NULL, 3600, 3, 'uncommon', 3, true),
    ('training', 'Elite Marathon Training', 'Elite endurance training for maximum stamina (6-8 points)', 500, 7, NULL, 7200, 5, 'rare', 2, true),
    
    -- Temper Training Items
    ('training', 'Temperament Training', 'Behavior training to improve temper by 2-4 points', 150, 3, NULL, 1800, 1, 'common', 5, true),
    ('training', 'Advanced Behavior Training', 'Professional temperament training (4-6 points)', 300, 5, NULL, 3600, 3, 'uncommon', 3, true),
    ('training', 'Elite Psychology Training', 'Elite mental training for perfect temperament (6-8 points)', 500, 7, NULL, 7200, 5, 'rare', 2, true),
    
    -- Multi-Stat Training Items
    ('training', 'All-Around Training', 'Basic training for all stats (+1-2 points each)', 400, 2, NULL, 3600, 2, 'uncommon', 3, true),
    ('training', 'Professional Training Package', 'Comprehensive training (+2-3 points each stat)', 800, 3, NULL, 7200, 5, 'rare', 2, true),
    ('training', 'Elite Champion Training', 'Ultimate training program (+3-4 points each stat)', 1500, 4, NULL, 14400, 8, 'epic', 1, true);

-- Create training_sessions table to track training history
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    animal_id UUID REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
    training_item_name TEXT NOT NULL,
    stat_trained TEXT NOT NULL,
    stat_gain INTEGER NOT NULL,
    experience_gain INTEGER NOT NULL,
    training_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success_rate DECIMAL(5,2) DEFAULT 100.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies for training_sessions
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own training sessions" ON training_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training sessions" ON training_sessions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create training_cooldowns table to manage training cooldowns
CREATE TABLE IF NOT EXISTS training_cooldowns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    animal_id UUID REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
    stat_type TEXT NOT NULL,
    cooldown_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(animal_id, stat_type)
);

-- Add RLS policies for training_cooldowns
ALTER TABLE training_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own training cooldowns" ON training_cooldowns
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training cooldowns" ON training_cooldowns
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training cooldowns" ON training_cooldowns
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training cooldowns" ON training_cooldowns
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_training_sessions_user_animal ON training_sessions(user_id, animal_id);
CREATE INDEX idx_training_sessions_date ON training_sessions(training_date DESC);
CREATE INDEX idx_training_cooldowns_animal_stat ON training_cooldowns(animal_id, stat_type);
CREATE INDEX idx_training_cooldowns_expires ON training_cooldowns(cooldown_expires_at);

-- Function to check if training is allowed (not on cooldown)
CREATE OR REPLACE FUNCTION can_train_stat(p_animal_id UUID, p_stat_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if there's an active cooldown for this animal and stat
    IF EXISTS (
        SELECT 1 FROM training_cooldowns 
        WHERE animal_id = p_animal_id 
        AND stat_type = p_stat_type 
        AND cooldown_expires_at > CURRENT_TIMESTAMP
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set training cooldown
CREATE OR REPLACE FUNCTION set_training_cooldown(p_user_id UUID, p_animal_id UUID, p_stat_type TEXT, p_cooldown_seconds INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Insert or update cooldown
    INSERT INTO training_cooldowns (user_id, animal_id, stat_type, cooldown_expires_at)
    VALUES (p_user_id, p_animal_id, p_stat_type, CURRENT_TIMESTAMP + (p_cooldown_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (animal_id, stat_type) 
    DO UPDATE SET 
        cooldown_expires_at = CURRENT_TIMESTAMP + (p_cooldown_seconds || ' seconds')::INTERVAL,
        created_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get remaining cooldown time in seconds
CREATE OR REPLACE FUNCTION get_training_cooldown(p_animal_id UUID, p_stat_type TEXT)
RETURNS INTEGER AS $$
DECLARE
    remaining_seconds INTEGER;
BEGIN
    SELECT EXTRACT(EPOCH FROM (cooldown_expires_at - CURRENT_TIMESTAMP))::INTEGER
    INTO remaining_seconds
    FROM training_cooldowns 
    WHERE animal_id = p_animal_id 
    AND stat_type = p_stat_type 
    AND cooldown_expires_at > CURRENT_TIMESTAMP;
    
    RETURN COALESCE(remaining_seconds, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
