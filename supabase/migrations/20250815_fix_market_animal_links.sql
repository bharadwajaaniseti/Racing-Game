-- Update all animals to link to their corresponding market animals
UPDATE animals a
SET market_animal_id = ma.id
FROM market_animals ma
WHERE a.name = ma.name;

-- After linking, sync the hunger rates
-- This will ensure that animals without custom hunger rates inherit from their market animals
UPDATE animals a
SET hunger_rate = NULL
WHERE EXISTS (
    SELECT 1 
    FROM market_animals ma 
    WHERE ma.id = a.market_animal_id
);

-- Verify the updates
SELECT 
    a.id,
    a.name,
    a.hunger_rate as animal_hunger_rate,
    ma.hunger_rate as market_hunger_rate,
    ma.name as market_name
FROM animals a
LEFT JOIN market_animals ma ON a.market_animal_id = ma.id;
