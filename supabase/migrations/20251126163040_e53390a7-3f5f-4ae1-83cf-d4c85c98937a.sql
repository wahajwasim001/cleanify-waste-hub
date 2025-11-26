-- Relax SELECT policy on user_roles so all authenticated users can see roles (needed for team leader assigning members)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Authenticated can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);