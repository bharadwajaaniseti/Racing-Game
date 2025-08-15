-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Function to propagate hunger rate changes to purchased animals
CREATE OR REPLACE FUNCTION propagate_market_hunger_rate_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If hunger_rate has changed, update all purchased animals
  IF OLD.hunger_rate != NEW.hunger_rate THEN
    -- Update all purchased instances of this animal
    UPDATE animals
    SET hunger_rate = NEW.hunger_rate
    WHERE market_animal_id = NEW.id;
    
    -- Notify users about the change
    INSERT INTO notifications (user_id, title, message)
    SELECT DISTINCT
      user_id,
      'Animal Hunger Rate Changed',
      format('The hunger rate for your %s has been adjusted to %s per minute', NEW.name, NEW.hunger_rate)
    FROM animals
    WHERE market_animal_id = NEW.id
    AND user_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update hunger rates for all purchased instances
CREATE OR REPLACE TRIGGER sync_market_hunger_rate
  AFTER UPDATE OF hunger_rate ON market_animals
  FOR EACH ROW
  EXECUTE FUNCTION propagate_market_hunger_rate_changes();

-- Create policy to allow users to read their own notifications
CREATE POLICY read_own_notifications ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow system to create notifications
CREATE POLICY create_system_notifications ON notifications
  FOR INSERT
  WITH CHECK (true);  -- This allows the system to create notifications for any user
