-- Check what columns actually exist in market_animals table
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'market_animals' 
AND table_schema = 'public'
ORDER BY ordinal_position;
