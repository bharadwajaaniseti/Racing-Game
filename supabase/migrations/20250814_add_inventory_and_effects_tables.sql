-- Create table for tracking active effects
CREATE TABLE active_effects (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    effect_type text NOT NULL,
    effect_value int4 NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT valid_effect_type CHECK (effect_type IN ('stat_boost', 'race_boost', 'cosmetic'))
);

-- Create table for tracking item usage history and cooldowns
CREATE TABLE item_usage_history (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    item_id uuid REFERENCES market_items NOT NULL,
    last_used timestamptz DEFAULT now()
);

-- Create table for user inventory
CREATE TABLE user_inventory (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    item_name text REFERENCES market_items(name) NOT NULL,
    quantity int4 NOT NULL DEFAULT 1,
    
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT unique_user_item UNIQUE (user_id, item_name)
);

-- Add indexes for performance
CREATE INDEX idx_active_effects_user ON active_effects(user_id);
CREATE INDEX idx_active_effects_expires ON active_effects(expires_at);
CREATE INDEX idx_item_usage_user_item ON item_usage_history(user_id, item_id);
CREATE INDEX idx_user_inventory_user ON user_inventory(user_id);

-- Add RLS policies
ALTER TABLE active_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- Users can read their own effects
CREATE POLICY "Users can view their own effects"
    ON active_effects FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view their own item usage history
CREATE POLICY "Users can view their own item usage"
    ON item_usage_history FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view and modify their own inventory
CREATE POLICY "Users can view their own inventory"
    ON user_inventory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
    ON user_inventory FOR UPDATE
    USING (auth.uid() = user_id);

-- Create function to clean up expired effects
CREATE OR REPLACE FUNCTION cleanup_expired_effects()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM active_effects
    WHERE expires_at < now();
END;
$$;

-- Create a cron job to clean up expired effects every hour
SELECT cron.schedule(
    'cleanup-expired-effects',
    '0 * * * *', -- Run every hour
    'SELECT cleanup_expired_effects()'
);
