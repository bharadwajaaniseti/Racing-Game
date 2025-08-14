-- Create policies for the animals bucket
BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Give users read access" ON storage.objects;
DROP POLICY IF EXISTS "Give admin insert access" ON storage.objects;
DROP POLICY IF EXISTS "Give admin delete access" ON storage.objects;

-- Policy for anyone to read
CREATE POLICY "Give users read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'animals' );

-- Policy for admins to upload
CREATE POLICY "Give admin insert access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'animals' 
  AND (
    SELECT is_admin
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- Policy for admins to delete
CREATE POLICY "Give admin delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'animals'
  AND (
    SELECT is_admin
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

COMMIT;
