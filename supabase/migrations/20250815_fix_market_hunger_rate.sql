-- Update wolf template to have correct hunger rate
UPDATE market_animals
SET hunger_rate = 30
WHERE name = 'Wolf';

-- Double check the update worked
SELECT name, hunger_rate 
FROM market_animals 
WHERE name = 'Wolf';
