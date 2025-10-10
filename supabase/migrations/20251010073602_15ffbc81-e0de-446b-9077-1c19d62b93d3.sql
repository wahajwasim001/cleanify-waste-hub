-- Add location and photo fields to waste_requests
ALTER TABLE public.waste_requests 
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric,
ADD COLUMN address text,
ADD COLUMN photo_url text;

-- Create storage bucket for waste photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('waste-photos', 'waste-photos', true);

-- Allow citizens to upload their own photos
CREATE POLICY "Citizens can upload waste photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'waste-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view photos
CREATE POLICY "Anyone can view waste photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'waste-photos');