
-- Fix storage RLS policies for home-photos bucket to support chat-uploads/ prefix
-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own home photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own home photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own home photos" ON storage.objects;

-- Recreate INSERT policy supporting both path patterns
CREATE POLICY "Users can upload their own home photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'home-photos'
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- Recreate UPDATE policy
CREATE POLICY "Users can update their own home photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'home-photos'
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- Recreate DELETE policy
CREATE POLICY "Users can delete their own home photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'home-photos'
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);
