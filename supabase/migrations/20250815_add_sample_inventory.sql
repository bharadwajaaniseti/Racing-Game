-- Add sample food items to user inventory for testing
-- This will add items for any user who has animals (assuming they're the current user)
DO $$
DECLARE 
    user_record RECORD;
BEGIN
    -- Find users who have animals and add sample items
    FOR user_record IN 
        SELECT DISTINCT user_id FROM animals
    LOOP
        -- Add Lucky Clover food item
        INSERT INTO user_inventory (user_id, item_name, quantity)
        VALUES (user_record.user_id, 'Lucky Clover', 5)
        ON CONFLICT (user_id, item_name) 
        DO UPDATE SET quantity = user_inventory.quantity + 3;

        -- Add Speed Training item  
        INSERT INTO user_inventory (user_id, item_name, quantity)
        VALUES (user_record.user_id, 'Speed Training Supplement', 3)
        ON CONFLICT (user_id, item_name)
        DO UPDATE SET quantity = user_inventory.quantity + 2;
    END LOOP;
END $$;
