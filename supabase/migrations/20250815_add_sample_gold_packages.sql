-- Insert sample gold packages
INSERT INTO market_items (name, description, type, price, effect_value, is_active, rarity)
VALUES 
  ('Starter Gold Pack', 'Get started with 1,000 gold coins!', 'gold', 4.99, 1000, true, 'common'),
  ('Premium Gold Pack', 'Boost your wealth with 5,000 gold coins!', 'gold', 19.99, 5000, true, 'rare'),
  ('Royal Gold Pack', 'Become rich with 12,000 gold coins!', 'gold', 39.99, 12000, true, 'legendary');
