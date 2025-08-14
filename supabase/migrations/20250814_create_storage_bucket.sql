-- Create the animals bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('animals', 'animals', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
