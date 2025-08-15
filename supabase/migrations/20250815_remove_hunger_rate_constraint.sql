-- Remove NOT NULL constraint from animals.hunger_rate
ALTER TABLE animals 
ALTER COLUMN hunger_rate DROP NOT NULL;
