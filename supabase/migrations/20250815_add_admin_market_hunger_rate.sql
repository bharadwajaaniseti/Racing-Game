-- Function for admins to set hunger rate for market animals
CREATE OR REPLACE FUNCTION admin_set_market_hunger_rate(market_animal_id uuid, new_rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate the new rate
  IF new_rate <= 0 THEN
    RAISE EXCEPTION 'Hunger rate must be greater than 0';
  END IF;

  -- Update the hunger rate for the market animal
  UPDATE market_animals
  SET hunger_rate = new_rate
  WHERE id = market_animal_id;
END;
$$;

-- Grant admin access to the hunger rate function
GRANT EXECUTE ON FUNCTION admin_set_market_hunger_rate TO authenticated;

-- Create policies to restrict hunger rate updates to admins
CREATE POLICY admin_market_hunger_rate_policy ON market_animals
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create policy for admin updates to existing animal hunger rates
CREATE POLICY admin_animal_hunger_rate_policy ON animals
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
