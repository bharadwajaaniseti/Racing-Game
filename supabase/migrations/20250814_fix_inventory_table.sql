-- Drop the old inventory table and create the new user_inventory table
DROP TABLE IF EXISTS inventory CASCADE;

-- Create user_inventory table with proper constraints
CREATE TABLE user_inventory (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    item_name text NOT NULL,
    quantity int4 NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT unique_user_item UNIQUE (user_id, item_name)
);

-- Enable RLS on the new table
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their own inventory"
    ON user_inventory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
    ON user_inventory FOR ALL
    USING (auth.uid() = user_id);

-- Add an index for performance
CREATE INDEX idx_user_inventory_user ON user_inventory(user_id);

-- Create the updated_at trigger
CREATE TRIGGER update_user_inventory_updated_at
    BEFORE UPDATE ON user_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recreate the buy_item function
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
    v_user_gold int;
    v_current_quantity int;
BEGIN
    -- Get item details
    SELECT * INTO v_item 
    FROM market_items 
    WHERE id = p_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    -- Get user's current gold
    SELECT gold INTO v_user_gold 
    FROM user_currency 
    WHERE user_id = p_user_id;

    IF v_user_gold IS NULL THEN
        -- Create initial currency record if it doesn't exist
        INSERT INTO user_currency (user_id, gold)
        VALUES (p_user_id, 100)
        RETURNING gold INTO v_user_gold;
    END IF;

    IF v_user_gold < v_item.price THEN
        RAISE EXCEPTION 'Insufficient gold';
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
        -- Deduct gold
        UPDATE user_currency 
        SET gold = gold - v_item.price 
        WHERE user_id = p_user_id;

        -- Add to inventory with upsert
        INSERT INTO user_inventory (user_id, item_name, quantity)
        VALUES (p_user_id, v_item.name, 1)
        ON CONFLICT (user_id, item_name)
        DO UPDATE SET quantity = user_inventory.quantity + 1
        WHERE user_inventory.quantity < COALESCE(v_item.max_stock, 2147483647);

        RETURN true;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Failed to purchase item: %', SQLERRM;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION buy_item(uuid, uuid) TO authenticated;
