-- Fix recycling_transactions - drop the generated column constraint and make it a regular column
-- First drop the old column
ALTER TABLE public.recycling_transactions DROP COLUMN IF EXISTS total_items;

-- Recreate as a regular column with default
ALTER TABLE public.recycling_transactions 
ADD COLUMN total_items integer DEFAULT 0;

-- Ensure reward_pkr has a default
ALTER TABLE public.recycling_transactions 
ALTER COLUMN reward_pkr SET DEFAULT 0;

-- Drop and recreate the trigger to ensure it runs BEFORE insert
DROP TRIGGER IF EXISTS calculate_recycling_reward_trigger ON public.recycling_transactions;

CREATE TRIGGER calculate_recycling_reward_trigger
BEFORE INSERT ON public.recycling_transactions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_recycling_reward();