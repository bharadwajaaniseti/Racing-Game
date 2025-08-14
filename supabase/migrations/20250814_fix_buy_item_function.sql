-- Drop and recreate the buy_item function to use coins instead of gold
CREATE OR REPLACE FUNCTION buy_item(
    p_item_id uuid,
    p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item market_items%ROWTYPE;
    v_user_coins int;
    v_current_quantity int;
BEGIN
    -- Get item details
    SELECT * INTO v_item 
    FROM market_items 
    WHERE id = p_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    -- Get user's current coins
    SELECT coins INTO v_user_coins 
    FROM profiles 
    WHERE id = p_user_id;

    IF v_user_coins < v_item.price THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    -- Check current quantity in inventory if max_stock is set
    IF v_item.max_stock IS NOT NULL THEN
        SELECT COALESCE(quantity, 0) INTO v_current_quantity
        FROM user_inventory
        WHERE user_id = p_user_id AND item_name = v_item.name;

        IF COALESCE(v_current_quantity, 0) >= v_item.max_stock THEN
            RAISE EXCEPTION 'Maximum stock reached for this item';
        END IF;
    END IF;

    -- Begin a transaction
    BEGIN
        -- Deduct coins
        UPDATE profiles 
        SET coins = coins - v_item.price 
        WHERE id = p_user_id;

        -- Add to inventory with upsert
        INSERT INTO user_inventory (user_id, item_name, quantity)
        VALUES (p_user_id, v_item.name, 1)
        ON CONFLICT (user_id, item_name)
        DO UPDATE SET quantity = user_inventory.quantity + 1
        WHERE user_inventory.quantity < COALESCE(v_item.max_stock, 2147483647);

        RETURN true;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback happens automatically on exception
            RAISE EXCEPTION 'Failed to purchase item: %', SQLERRM;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION buy_item(uuid, uuid) TO authenticated;
