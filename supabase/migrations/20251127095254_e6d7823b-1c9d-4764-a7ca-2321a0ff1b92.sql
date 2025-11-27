-- Allow team leaders to view profiles of team members (needed for adding members to team)
CREATE POLICY "Team leaders can view team member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'team_leader'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'team_member'
  )
);