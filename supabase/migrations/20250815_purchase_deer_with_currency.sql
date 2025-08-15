-- Begin transaction
BEGIN;

-- First create a currency record for the user with some initial gold
INSERT INTO user_currency (user_id, gold)
VALUES ('210ebe44-d524-47ef-8e8d-c3ba71d953ee', 1000, 0)
ON CONFLICT (user_id) DO UPDATE 
SET gold = user_currency.gold;  -- Keep existing gold if record exists

-- Call buy_animal function to purchase the Deer
SELECT buy_animal('4d22623c-87df-4e24-ad0a-8e5dcb773aa2');

-- Show the newly created animal record
SELECT 
    a.*,
    ma.name as market_template_name,
    ma.hunger_rate as template_hunger_rate,
    uc.gold as user_remaining_gold
FROM animals a
JOIN market_animals ma ON a.market_animal_id = ma.id
JOIN user_currency uc ON a.user_id = uc.user_id
WHERE a.market_animal_id = '4d22623c-87df-4e24-ad0a-8e5dcb773aa2'
  AND a.user_id = '210ebe44-d524-47ef-8e8d-c3ba71d953ee'
ORDER BY a.created_at DESC
LIMIT 1;

COMMIT;
