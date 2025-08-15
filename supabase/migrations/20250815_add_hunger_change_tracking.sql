-- Create table to track hunger rate changes for user notifications
CREATE TABLE IF NOT EXISTS hunger_rate_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    animal_id UUID NOT NULL,
    animal_name TEXT NOT NULL,
    old_hunger_rate DECIMAL,
    new_hunger_rate DECIMAL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_notified BOOLEAN DEFAULT FALSE,
    
    -- Indexes for performance
    CONSTRAINT idx_hunger_changes_user_animal UNIQUE(user_id, animal_id, changed_at)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hunger_changes_user_notified ON hunger_rate_changes(user_id, user_notified);
CREATE INDEX IF NOT EXISTS idx_hunger_changes_recent ON hunger_rate_changes(changed_at DESC);

-- Function to log hunger rate changes
CREATE OR REPLACE FUNCTION log_hunger_rate_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if hunger_rate actually changed
    IF OLD.hunger_rate IS DISTINCT FROM NEW.hunger_rate THEN
        INSERT INTO hunger_rate_changes (
            user_id, 
            animal_id, 
            animal_name, 
            old_hunger_rate, 
            new_hunger_rate,
            changed_by
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.name,
            OLD.hunger_rate,
            NEW.hunger_rate,
            current_setting('request.jwt.claims', true)::json->>'sub'::uuid
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log hunger rate changes
DROP TRIGGER IF EXISTS trigger_log_hunger_rate_change ON animals;
CREATE TRIGGER trigger_log_hunger_rate_change
    AFTER UPDATE ON animals
    FOR EACH ROW
    EXECUTE FUNCTION log_hunger_rate_change();

-- Function to get unnotified hunger rate changes for a user
CREATE OR REPLACE FUNCTION get_unnotified_hunger_changes(p_user_id UUID)
RETURNS TABLE (
    animal_name TEXT,
    old_rate DECIMAL,
    new_rate DECIMAL,
    changed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.animal_name,
        h.old_hunger_rate,
        h.new_hunger_rate,
        h.changed_at
    FROM hunger_rate_changes h
    WHERE h.user_id = p_user_id 
    AND h.user_notified = FALSE
    ORDER BY h.changed_at DESC;
    
    -- Mark as notified
    UPDATE hunger_rate_changes 
    SET user_notified = TRUE 
    WHERE user_id = p_user_id AND user_notified = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
