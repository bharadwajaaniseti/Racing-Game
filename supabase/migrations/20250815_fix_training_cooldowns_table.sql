-- Add missing expires_at column to training_cooldowns table
-- First, let's make sure the table exists with the correct structure

-- Drop and recreate the training_cooldowns table with all required columns
DROP TABLE IF EXISTS training_cooldowns;

CREATE TABLE training_cooldowns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    animal_id UUID NOT NULL,
    stat_type TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one cooldown per user/animal/stat combination
    UNIQUE(user_id, animal_id, stat_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_cooldowns_user_animal ON training_cooldowns(user_id, animal_id);
CREATE INDEX IF NOT EXISTS idx_training_cooldowns_expires ON training_cooldowns(expires_at);
CREATE INDEX IF NOT EXISTS idx_training_cooldowns_lookup ON training_cooldowns(user_id, animal_id, stat_type);
