-- Add assigned_member_id to track team member assignments
-- This keeps team leader assigned while also tracking which member is working on it
ALTER TABLE public.waste_requests 
ADD COLUMN assigned_member_id uuid REFERENCES public.profiles(id);