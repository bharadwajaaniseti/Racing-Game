-- Debug query to show all relevant hunger rate information
SELECT 
    a.name as animal_name,
    a.hunger_rate as animal_hunger_rate,
    ma.hunger_rate as market_template_rate,
    a.market_animal_id,
    a.user_id IS NOT NULL as is_purchased,
    ma.name as template_name
FROM animals a
LEFT JOIN market_animals ma ON a.market_animal_id = ma.id
WHERE a.name = 'Wolf'
ORDER BY a.created_at DESC;
