-- Create storage policies for waste-photos bucket
-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload waste photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'waste-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read all waste photos
CREATE POLICY "Users can view waste photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'waste-photos');

-- Allow users to update their own photos
CREATE POLICY "Users can update own waste photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'waste-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own waste photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'waste-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Clean up duplicate citizen roles - keep only the primary role for each user
-- Delete duplicate citizen roles where user has a higher priority role
DELETE FROM public.user_roles
WHERE role = 'citizen'
AND user_id IN (
  SELECT user_id FROM public.user_roles
  WHERE role IN ('admin', 'team_leader', 'team_member')
);