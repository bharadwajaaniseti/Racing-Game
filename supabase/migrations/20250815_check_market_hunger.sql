-- Check market animal's hunger rate
SELECT 
    id,
    name,
    hunger_rate,
    CASE 
        WHEN hunger_rate IS NULL THEN 'Missing hunger rate!'
        ELSE 'OK'
    END as status
FROM market_animals 
WHERE id = '4d22623c-87df-4e24-ad0a-8e5dcb773aa2';
