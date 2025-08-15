-- Enhanced training function with specific item matching and cooldown support
CREATE OR REPLACE FUNCTION enhanced_train_animal(
    p_animal_id UUID,
    p_stat_type TEXT,
    p_training_item_name TEXT,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_animal RECORD;
    v_training_item RECORD;
    v_inventory_item RECORD;
    v_stat_gain INTEGER;
    v_experience_gain INTEGER;
    v_new_stat_value INTEGER;
    v_new_experience INTEGER;
    v_new_level INTEGER;
    v_current_stat_value INTEGER;
    v_success_rate DECIMAL;
    v_cooldown_seconds INTEGER;
    v_result JSON;
BEGIN
    -- Check if animal belongs to user
    SELECT * INTO v_animal FROM animals WHERE id = p_animal_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Animal not found or unauthorized');
    END IF;

    -- Check training cooldown
    IF NOT can_train_stat(p_animal_id, p_stat_type) THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Training cooldown active. Wait before training this stat again.',
            'cooldownRemaining', get_training_cooldown(p_animal_id, p_stat_type)
        );
    END IF;

    -- Get training item details from market
    SELECT * INTO v_training_item FROM market_items 
    WHERE name = p_training_item_name AND type = 'training' AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Training item not found in market');
    END IF;

    -- Check if user has the training item in inventory
    SELECT * INTO v_inventory_item FROM user_inventory 
    WHERE user_id = p_user_id AND item_name = p_training_item_name AND quantity > 0;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Training item not available in inventory');
    END IF;

    -- Get current stat value
    CASE p_stat_type
        WHEN 'speed' THEN v_current_stat_value := v_animal.speed;
        WHEN 'acceleration' THEN v_current_stat_value := v_animal.acceleration;
        WHEN 'stamina' THEN v_current_stat_value := v_animal.stamina;
        WHEN 'temper' THEN v_current_stat_value := v_animal.temper;
        ELSE RETURN json_build_object('success', false, 'message', 'Invalid stat type');
    END CASE;

    -- Check if stat is already maxed
    IF v_current_stat_value >= 100 THEN
        RETURN json_build_object('success', false, 'message', 'Stat is already at maximum (100)');
    END IF;

    -- Calculate training success based on item quality and animal level
    v_success_rate := CASE v_training_item.rarity
        WHEN 'common' THEN 85.0
        WHEN 'uncommon' THEN 90.0
        WHEN 'rare' THEN 95.0
        WHEN 'epic' THEN 98.0
        WHEN 'legendary' THEN 99.5
        ELSE 80.0
    END;

    -- Adjust success rate based on animal level (higher level = slightly lower success for balance)
    v_success_rate := v_success_rate - (v_animal.level * 0.5);
    v_success_rate := GREATEST(v_success_rate, 50.0); -- Minimum 50% success rate

    -- Check if training succeeds
    IF random() * 100 > v_success_rate THEN
        -- Training failed
        v_stat_gain := 0;
        v_experience_gain := FLOOR(random() * 3) + 1; -- Small consolation experience
        
        -- Still consume the training item
        IF v_inventory_item.quantity = 1 THEN
            DELETE FROM user_inventory WHERE id = v_inventory_item.id;
        ELSE
            UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_item.id;
        END IF;

        -- Set a shorter cooldown for failed attempts
        PERFORM set_training_cooldown(p_user_id, p_animal_id, p_stat_type, v_training_item.cooldown_seconds / 2);

        -- Log the training session
        INSERT INTO training_sessions (user_id, animal_id, training_item_name, stat_trained, stat_gain, experience_gain, success_rate)
        VALUES (p_user_id, p_animal_id, p_training_item_name, p_stat_type, v_stat_gain, v_experience_gain, v_success_rate);

        RETURN json_build_object(
            'success', false,
            'message', 'Training failed! Better luck next time.',
            'statGain', v_stat_gain,
            'experienceGain', v_experience_gain,
            'successRate', v_success_rate,
            'cooldownSeconds', v_training_item.cooldown_seconds / 2
        );
    END IF;

    -- Training succeeded - calculate gains
    v_stat_gain := v_training_item.effect_value + FLOOR(random() * 2); -- Base gain + 0-1 bonus
    v_experience_gain := v_stat_gain * 3 + FLOOR(random() * 5) + 5; -- More experience for better training

    -- Handle multi-stat training items
    IF p_training_item_name LIKE '%All-Around%' OR p_training_item_name LIKE '%Professional Training Package%' OR p_training_item_name LIKE '%Elite Champion Training%' THEN
        -- Apply gains to all stats
        UPDATE animals SET 
            speed = LEAST(100, speed + v_stat_gain),
            acceleration = LEAST(100, acceleration + v_stat_gain),
            stamina = LEAST(100, stamina + v_stat_gain),
            temper = LEAST(100, temper + v_stat_gain),
            experience = experience + v_experience_gain,
            level = FLOOR((experience + v_experience_gain) / 100) + 1
        WHERE id = p_animal_id;
        
        v_result := json_build_object(
            'success', true,
            'message', format('Multi-stat training successful! All stats increased by %s points!', v_stat_gain),
            'statGain', v_stat_gain,
            'experienceGain', v_experience_gain,
            'multiStat', true,
            'successRate', v_success_rate
        );
    ELSE
        -- Apply gain to specific stat
        v_new_stat_value := LEAST(100, v_current_stat_value + v_stat_gain);
        v_new_experience := v_animal.experience + v_experience_gain;
        v_new_level := FLOOR(v_new_experience / 100) + 1;

        -- Update the specific stat
        CASE p_stat_type
            WHEN 'speed' THEN 
                UPDATE animals SET speed = v_new_stat_value, experience = v_new_experience, level = v_new_level WHERE id = p_animal_id;
            WHEN 'acceleration' THEN 
                UPDATE animals SET acceleration = v_new_stat_value, experience = v_new_experience, level = v_new_level WHERE id = p_animal_id;
            WHEN 'stamina' THEN 
                UPDATE animals SET stamina = v_new_stat_value, experience = v_new_experience, level = v_new_level WHERE id = p_animal_id;
            WHEN 'temper' THEN 
                UPDATE animals SET temper = v_new_stat_value, experience = v_new_experience, level = v_new_level WHERE id = p_animal_id;
        END CASE;

        v_result := json_build_object(
            'success', true,
            'message', format('%s training successful! %s increased by %s points!', 
                initcap(p_stat_type), initcap(p_stat_type), v_stat_gain),
            'statGain', v_stat_gain,
            'experienceGain', v_experience_gain,
            'newStatValue', v_new_stat_value,
            'newLevel', v_new_level,
            'successRate', v_success_rate,
            'cooldownSeconds', v_cooldown_seconds
        );
    END IF;

    -- Consume training item
    IF v_inventory_item.quantity = 1 THEN
        DELETE FROM user_inventory WHERE id = v_inventory_item.id;
    ELSE
        UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_item.id;
    END IF;

    -- Set training cooldown
    v_cooldown_seconds := COALESCE(v_training_item.cooldown_seconds, 3600); -- Default 1 hour
    PERFORM set_training_cooldown(p_user_id, p_animal_id, p_stat_type, v_cooldown_seconds);

    -- Log the training session
    INSERT INTO training_sessions (user_id, animal_id, training_item_name, stat_trained, stat_gain, experience_gain, success_rate)
    VALUES (p_user_id, p_animal_id, p_training_item_name, p_stat_type, v_stat_gain, v_experience_gain, v_success_rate);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
