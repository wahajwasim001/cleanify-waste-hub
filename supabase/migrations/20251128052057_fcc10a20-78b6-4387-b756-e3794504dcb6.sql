-- Allow anyone to insert donations (public donation form)
CREATE POLICY "Anyone can create donations"
ON public.donations
FOR INSERT
WITH CHECK (true);