-- Add is_active column to market_items table
ALTER TABLE market_items
ADD COLUMN is_active boolean DEFAULT true;

-- Update existing rows to have is_active = true
UPDATE market_items
SET is_active = true
WHERE is_active IS NULL;

-- Add comment to the column
COMMENT ON COLUMN market_items.is_active IS 'Indicates if the item is currently available in the market';
