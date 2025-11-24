-- Fix user_roles RLS policy to allow users to insert their own role during signup
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

-- Create separate policies for INSERT, UPDATE, DELETE
-- Allow users to insert their own role during signup
CREATE POLICY "Users can insert own role on signup"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Only admins can update or delete roles
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));