-- Buy Animal Function
CREATE OR REPLACE FUNCTION buy_animal(p_market_id uuid)
RETURNS void AS $$
DECLARE
    v_market_animal market_animals%ROWTYPE;
    v_user_gold numeric;
BEGIN
    -- Get the market animal
    SELECT * INTO v_market_animal
    FROM market_animals
    WHERE id = p_market_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Animal not found in market';
    END IF;

    -- Get user's gold from user_currency
    SELECT gold INTO v_user_gold
    FROM user_currency
    WHERE user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User currency record not found';
    END IF;

    -- Check if user has enough gold
    IF v_user_gold < v_market_animal.price THEN
        RAISE EXCEPTION 'Insufficient gold';
    END IF;

    -- Create the animal for the user
    INSERT INTO animals (
        user_id,
        name,
        type,
        speed,
        acceleration,
        stamina,
        temper,
        level,
        model_url,
        model_scale,
        model_rotation,
        idle_anim,
        run_anim
    ) VALUES (
        auth.uid(),
        v_market_animal.name,
        v_market_animal.type,
        v_market_animal.speed,
        v_market_animal.acceleration,
        v_market_animal.stamina,
        v_market_animal.temper,
        1,
        v_market_animal.model_url,
        v_market_animal.model_scale,
        v_market_animal.model_rotation,
        v_market_animal.idle_anim,
        v_market_animal.run_anim
    );

    -- Update user's gold
    UPDATE user_currency
    SET gold = gold - v_market_animal.price
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
