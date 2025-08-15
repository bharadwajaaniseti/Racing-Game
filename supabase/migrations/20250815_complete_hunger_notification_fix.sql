-- Fix the hunger notification system completely
-- This migration ensures all components work together

-- 1. Create or update the hunger_rate_changes table with proper structure
ALTER TABLE hunger_rate_changes 
ADD COLUMN IF NOT EXISTS change_reason TEXT DEFAULT 'Direct animal update';

-- 2. Create the animals_with_hunger view if it doesn't exist properly
DROP VIEW IF EXISTS animals_with_hunger;
CREATE VIEW animals_with_hunger AS
SELECT 
    a.id,
    a.name,
    a.user_id,
    a.type as animal_type,
    a.hunger_rate,
    ma.hunger_rate as market_hunger_rate
FROM animals a
LEFT JOIN market_animals ma ON a.type = ma.animal_type;

-- 3. Create the log_hunger_rate_change trigger function
CREATE OR REPLACE FUNCTION log_hunger_rate_change()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
BEGIN
    -- Only log if hunger_rate actually changed
    IF OLD.hunger_rate IS DISTINCT FROM NEW.hunger_rate THEN
        -- Try to get the user who made the change from JWT claims
        BEGIN
            v_changed_by := COALESCE(
                (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
                NEW.user_id -- Fallback to animal owner if no JWT claims
            );
        EXCEPTION WHEN OTHERS THEN
            v_changed_by := NEW.user_id; -- Fallback on any error
        END;
        
        INSERT INTO hunger_rate_changes (
            user_id, 
            animal_id, 
            animal_name, 
            old_hunger_rate, 
            new_hunger_rate,
            changed_by,
            change_reason,
            user_notified
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.name,
            OLD.hunger_rate,
            NEW.hunger_rate,
            v_changed_by,
            'Direct animal update',
            FALSE
        );
        
        -- Debug logging (will appear in Supabase logs)
        RAISE NOTICE 'Hunger rate change logged for animal % (%) from % to %', 
            NEW.name, NEW.id, OLD.hunger_rate, NEW.hunger_rate;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS trigger_log_hunger_rate_change ON animals;
CREATE TRIGGER trigger_log_hunger_rate_change
    AFTER UPDATE ON animals
    FOR EACH ROW
    EXECUTE FUNCTION log_hunger_rate_change();

-- 5. Create the get_unnotified_hunger_changes function
CREATE OR REPLACE FUNCTION get_unnotified_hunger_changes(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    animal_name TEXT,
    old_hunger_rate DECIMAL,
    new_hunger_rate DECIMAL,
    changed_at TIMESTAMPTZ,
    change_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hrc.id,
        hrc.animal_name,
        hrc.old_hunger_rate,
        hrc.new_hunger_rate,
        hrc.created_at,
        hrc.change_reason
    FROM hunger_rate_changes hrc
    WHERE hrc.user_id = p_user_id
    AND hrc.user_notified = FALSE
    ORDER BY hrc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to mark changes as notified
CREATE OR REPLACE FUNCTION mark_hunger_changes_notified(p_change_ids UUID[])
RETURNS VOID AS $$
BEGIN
    UPDATE hunger_rate_changes 
    SET user_notified = TRUE 
    WHERE id = ANY(p_change_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable Row Level Security but allow admin access
ALTER TABLE hunger_rate_changes ENABLE ROW LEVEL SECURITY;

-- 8. Create policies for hunger_rate_changes table
DROP POLICY IF EXISTS "Users can view their own hunger rate changes" ON hunger_rate_changes;
CREATE POLICY "Users can view their own hunger rate changes" ON hunger_rate_changes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert hunger rate changes" ON hunger_rate_changes;
CREATE POLICY "System can insert hunger rate changes" ON hunger_rate_changes
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their notification status" ON hunger_rate_changes;
CREATE POLICY "Users can update their notification status" ON hunger_rate_changes
    FOR UPDATE USING (auth.uid() = user_id);

-- 9. Allow admin to view all changes
DROP POLICY IF EXISTS "Admins can view all hunger rate changes" ON hunger_rate_changes;
CREATE POLICY "Admins can view all hunger rate changes" ON hunger_rate_changes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- 10. Test the system by creating a test function
CREATE OR REPLACE FUNCTION test_hunger_notification_complete()
RETURNS TEXT AS $$
DECLARE
    v_test_animal_id UUID;
    v_test_user_id UUID;
    v_result TEXT;
BEGIN
    -- Get first animal for testing
    SELECT id, user_id INTO v_test_animal_id, v_test_user_id
    FROM animals 
    LIMIT 1;
    
    IF v_test_animal_id IS NULL THEN
        RETURN 'No animals found for testing';
    END IF;
    
    -- Update hunger rate to trigger notification
    UPDATE animals 
    SET hunger_rate = COALESCE(hunger_rate, 1.0) + 0.1 
    WHERE id = v_test_animal_id;
    
    -- Check if change was logged
    IF EXISTS (
        SELECT 1 FROM hunger_rate_changes 
        WHERE animal_id = v_test_animal_id 
        AND user_notified = FALSE
        AND created_at > NOW() - INTERVAL '10 seconds'
    ) THEN
        v_result := 'SUCCESS: Hunger rate change logged successfully for animal ' || v_test_animal_id;
    ELSE
        v_result := 'FAILED: No hunger rate change was logged';
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
