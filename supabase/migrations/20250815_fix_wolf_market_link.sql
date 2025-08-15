-- Get the correct market animal ID for the Wolf
WITH wolf_market AS (
    SELECT id FROM market_animals WHERE name = 'Wolf' LIMIT 1
)
-- Update the specific wolf to connect it to its market template
UPDATE animals 
SET market_animal_id = (SELECT id FROM wolf_market)
WHERE id = '7f60ea6d-491a-462e-99b5-bc5b1dff415d';

-- Now update its hunger rate to match the template
UPDATE animals a
SET hunger_rate = ma.hunger_rate
FROM market_animals ma
WHERE a.id = '7f60ea6d-491a-462e-99b5-bc5b1dff415d'
AND ma.id = a.market_animal_id;
