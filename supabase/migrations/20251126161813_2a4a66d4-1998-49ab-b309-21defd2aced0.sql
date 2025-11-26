-- Create table to track team memberships
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_leader_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Team leaders can manage their team members
CREATE POLICY "Team leaders can manage own team"
ON public.team_memberships
FOR ALL
TO authenticated
USING (auth.uid() = team_leader_id);

-- Team members can view their team membership
CREATE POLICY "Team members can view own membership"
ON public.team_memberships
FOR SELECT
TO authenticated
USING (auth.uid() = team_member_id);

-- Admins can view all memberships
CREATE POLICY "Admins can view all memberships"
ON public.team_memberships
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));