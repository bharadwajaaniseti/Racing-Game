-- Create missing can_train_stat function
CREATE OR REPLACE FUNCTION can_train_stat(
    p_user_id UUID,
    p_animal_id UUID,
    p_stat_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_cooldown_remaining INTEGER;
BEGIN
    -- Get remaining cooldown time
    v_cooldown_remaining := get_training_cooldown(p_user_id, p_animal_id, p_stat_type);
    
    -- Return true if no cooldown (0 or negative means no cooldown)
    RETURN v_cooldown_remaining <= 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create the get_training_cooldown function if it doesn't exist
CREATE OR REPLACE FUNCTION get_training_cooldown(
    p_user_id UUID,
    p_animal_id UUID,
    p_stat_type TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_cooldown_record RECORD;
    v_remaining_seconds INTEGER;
BEGIN
    -- Get the cooldown record
    SELECT * INTO v_cooldown_record
    FROM training_cooldowns
    WHERE user_id = p_user_id 
    AND animal_id = p_animal_id 
    AND stat_type = p_stat_type;
    
    -- If no record found, no cooldown
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate remaining seconds
    v_remaining_seconds := EXTRACT(EPOCH FROM (v_cooldown_record.expires_at - NOW()))::INTEGER;
    
    -- If expired or negative, return 0
    IF v_remaining_seconds <= 0 THEN
        -- Clean up expired record
        DELETE FROM training_cooldowns 
        WHERE user_id = p_user_id 
        AND animal_id = p_animal_id 
        AND stat_type = p_stat_type;
        RETURN 0;
    END IF;
    
    RETURN v_remaining_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create the set_training_cooldown function if it doesn't exist
CREATE OR REPLACE FUNCTION set_training_cooldown(
    p_user_id UUID,
    p_animal_id UUID,
    p_stat_type TEXT,
    p_cooldown_seconds INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Insert or update cooldown
    INSERT INTO training_cooldowns (user_id, animal_id, stat_type, expires_at)
    VALUES (p_user_id, p_animal_id, p_stat_type, NOW() + INTERVAL '1 second' * p_cooldown_seconds)
    ON CONFLICT (user_id, animal_id, stat_type)
    DO UPDATE SET expires_at = NOW() + INTERVAL '1 second' * p_cooldown_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
