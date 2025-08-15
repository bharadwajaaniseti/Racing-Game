-- Fix JSON concatenation issue in enhanced_train_animal function
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
    -- Get animal details and verify ownership
    SELECT * INTO v_animal 
    FROM animals 
    WHERE id = p_animal_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Animal not found or not owned by user');
    END IF;

    -- Check if animal can train (not on cooldown)
    IF NOT can_train_stat(p_user_id, p_animal_id, p_stat_type) THEN
        DECLARE
            v_remaining_cooldown INTEGER;
        BEGIN
            v_remaining_cooldown := get_training_cooldown(p_user_id, p_animal_id, p_stat_type);
            RETURN json_build_object(
                'success', false, 
                'message', format('Training on cooldown. Time remaining: %s seconds', v_remaining_cooldown),
                'cooldownRemaining', v_remaining_cooldown
            );
        END;
    END IF;

    -- Get current stat value
    CASE p_stat_type
        WHEN 'speed' THEN v_current_stat_value := v_animal.speed;
        WHEN 'acceleration' THEN v_current_stat_value := v_animal.acceleration;
        WHEN 'stamina' THEN v_current_stat_value := v_animal.stamina;
        WHEN 'temper' THEN v_current_stat_value := v_animal.temper;
        ELSE 
            RETURN json_build_object('success', false, 'message', 'Invalid stat type');
    END CASE;

    -- Check if stat is already maxed
    IF v_current_stat_value >= 100 THEN
        RETURN json_build_object('success', false, 'message', format('%s is already at maximum level (100)', initcap(p_stat_type)));
    END IF;

    -- Get training item details
    SELECT * INTO v_training_item 
    FROM training_items 
    WHERE item_name = p_training_item_name;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Training item not found');
    END IF;

    -- Check if user has the training item
    SELECT * INTO v_inventory_item 
    FROM user_inventory 
    WHERE user_id = p_user_id AND item_name = p_training_item_name AND quantity > 0;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', format('You do not have any %s in your inventory', p_training_item_name));
    END IF;

    -- Check if the training item matches the stat being trained
    IF NOT (
        (p_stat_type = 'speed' AND (v_training_item.speed_boost > 0 OR v_training_item.all_stats_boost > 0)) OR
        (p_stat_type = 'acceleration' AND (v_training_item.acceleration_boost > 0 OR v_training_item.all_stats_boost > 0)) OR
        (p_stat_type = 'stamina' AND (v_training_item.stamina_boost > 0 OR v_training_item.all_stats_boost > 0)) OR
        (p_stat_type = 'temper' AND (v_training_item.temper_boost > 0 OR v_training_item.all_stats_boost > 0))
    ) THEN
        RETURN json_build_object('success', false, 'message', format('%s cannot be used to train %s', p_training_item_name, p_stat_type));
    END IF;

    -- Calculate success rate and stat gain
    v_success_rate := v_training_item.success_rate;
    v_experience_gain := v_training_item.experience_reward;

    -- Determine if training succeeds
    IF random() <= v_success_rate THEN
        -- Training succeeded
        CASE p_stat_type
            WHEN 'speed' THEN 
                v_stat_gain := GREATEST(v_training_item.speed_boost, v_training_item.all_stats_boost);
            WHEN 'acceleration' THEN 
                v_stat_gain := GREATEST(v_training_item.acceleration_boost, v_training_item.all_stats_boost);
            WHEN 'stamina' THEN 
                v_stat_gain := GREATEST(v_training_item.stamina_boost, v_training_item.all_stats_boost);
            WHEN 'temper' THEN 
                v_stat_gain := GREATEST(v_training_item.temper_boost, v_training_item.all_stats_boost);
        END CASE;

        -- Cap stat at 100
        v_new_stat_value := LEAST(v_current_stat_value + v_stat_gain, 100);
        v_new_experience := v_animal.experience + v_experience_gain;
        v_new_level := (v_new_experience / 100) + 1;

        -- Update animal stats
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

        -- Set training cooldown
        v_cooldown_seconds := COALESCE(v_training_item.cooldown_seconds, 3600); -- Default 1 hour
        PERFORM set_training_cooldown(p_user_id, p_animal_id, p_stat_type, v_cooldown_seconds);

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
    ELSE
        -- Training failed
        v_stat_gain := 0;
        v_new_stat_value := v_current_stat_value;
        v_new_experience := v_animal.experience;
        v_new_level := v_animal.level;

        -- Still set cooldown even on failure
        v_cooldown_seconds := COALESCE(v_training_item.cooldown_seconds, 3600);
        PERFORM set_training_cooldown(p_user_id, p_animal_id, p_stat_type, v_cooldown_seconds);

        v_result := json_build_object(
            'success', false,
            'message', format('%s training failed! Better luck next time.', initcap(p_stat_type)),
            'statGain', 0,
            'experienceGain', 0,
            'newStatValue', v_current_stat_value,
            'newLevel', v_animal.level,
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

    -- Log the training session
    INSERT INTO training_sessions (user_id, animal_id, training_item_name, stat_trained, stat_gain, experience_gain, success_rate)
    VALUES (p_user_id, p_animal_id, p_training_item_name, p_stat_type, v_stat_gain, v_experience_gain, v_success_rate);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
