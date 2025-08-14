-- Create user_currency table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_currency (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    gold int NOT NULL DEFAULT 100 CHECK (gold >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_user_currency UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE user_currency ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view their own currency"
    ON user_currency FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own currency"
    ON user_currency FOR ALL
    USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_currency_updated_at
    BEFORE UPDATE ON user_currency
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create initial records for existing users
INSERT INTO user_currency (user_id, gold)
SELECT id, 100
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
