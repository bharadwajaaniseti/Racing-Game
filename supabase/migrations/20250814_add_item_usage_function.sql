-- Create a function to handle item usage and apply effects
CREATE OR REPLACE FUNCTION use_item(p_item_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item market_items%ROWTYPE;
    v_profile profiles%ROWTYPE;
    v_current_time timestamptz;
    v_last_used timestamptz;
    v_cooldown_end timestamptz;
BEGIN
    -- Get current time
    v_current_time := now();
    
    -- Get item details
    SELECT * INTO v_item 
    FROM market_items 
    WHERE id = p_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;
    
    -- Get user's profile
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    
    -- Check level requirement
    IF v_profile.level < v_item.level_required THEN
        RAISE EXCEPTION 'Level requirement not met';
    END IF;
    
    -- Check cooldown
    SELECT last_used INTO v_last_used
    FROM item_usage_history
    WHERE user_id = p_user_id AND item_id = p_item_id
    ORDER BY last_used DESC
    LIMIT 1;
    
    IF v_last_used IS NOT NULL AND v_item.cooldown_seconds IS NOT NULL THEN
        v_cooldown_end := v_last_used + (v_item.cooldown_seconds || ' seconds')::interval;
        IF v_current_time < v_cooldown_end THEN
            RAISE EXCEPTION 'Item is still on cooldown';
        END IF;
    END IF;
    
    -- Apply item effects based on type
    CASE v_item.type
        WHEN 'food' THEN
            -- Insert temporary stat boost
            INSERT INTO active_effects (
                user_id,
                effect_type,
                effect_value,
                expires_at
            ) VALUES (
                p_user_id,
                'stat_boost',
                v_item.effect_value,
                v_current_time + (v_item.duration_seconds || ' seconds')::interval
            );
            
        WHEN 'training' THEN
            -- Apply permanent stat increase
            UPDATE profiles
            SET 
                speed = speed + (v_item.effect_value * 0.2),
                acceleration = acceleration + (v_item.effect_value * 0.2),
                handling = handling + (v_item.effect_value * 0.2),
                stamina = stamina + (v_item.effect_value * 0.2),
                temper = temper + (v_item.effect_value * 0.2)
            WHERE user_id = p_user_id;
            
        WHEN 'boost' THEN
            -- Insert race-specific boost
            INSERT INTO active_effects (
                user_id,
                effect_type,
                effect_value,
                expires_at
            ) VALUES (
                p_user_id,
                'race_boost',
                v_item.effect_value,
                v_current_time + (v_item.duration_seconds || ' seconds')::interval
            );
            
        WHEN 'cosmetic' THEN
            -- Apply cosmetic effect
            UPDATE profiles
            SET active_cosmetic = p_item_id
            WHERE user_id = p_user_id;
            
    END CASE;
    
    -- Record item usage
    INSERT INTO item_usage_history (
        user_id,
        item_id,
        last_used
    ) VALUES (
        p_user_id,
        p_item_id,
        v_current_time
    );
    
    -- Remove one item from inventory
    UPDATE user_inventory
    SET quantity = quantity - 1
    WHERE user_id = p_user_id AND item_name = v_item.name;
    
    -- Delete if quantity is 0
    DELETE FROM user_inventory
    WHERE user_id = p_user_id AND item_name = v_item.name AND quantity <= 0;
    
    RETURN true;
END;
$$;
