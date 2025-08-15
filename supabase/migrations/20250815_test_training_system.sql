-- Test data for enhanced training system

-- Check if new training items exist
SELECT name, description, effect_value, cooldown_seconds, rarity 
FROM market_items 
WHERE type = 'training' 
ORDER BY rarity DESC, effect_value DESC;

-- Check if training tables exist
SELECT COUNT(*) as training_sessions_count FROM training_sessions;
SELECT COUNT(*) as training_cooldowns_count FROM training_cooldowns;

-- Test training functions
SELECT can_train_stat('00000000-0000-0000-0000-000000000000'::UUID, 'speed');
SELECT get_training_cooldown('00000000-0000-0000-0000-000000000000'::UUID, 'speed');
