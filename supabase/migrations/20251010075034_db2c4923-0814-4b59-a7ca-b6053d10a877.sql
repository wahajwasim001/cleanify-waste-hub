-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'team_leader', 'team_member', 'citizen');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add wallet_balance to profiles
ALTER TABLE public.profiles ADD COLUMN wallet_balance NUMERIC DEFAULT 0 NOT NULL;

-- Update profiles RLS to use new role system
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

-- Create donations table
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  amount_pkr NUMERIC NOT NULL,
  donation_type TEXT DEFAULT 'general',
  allocated_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage donations"
ON public.donations FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view donations"
ON public.donations FOR SELECT
USING (true);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_pkr NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (true);

-- Create kiosks table
CREATE TABLE public.kiosks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view kiosks"
ON public.kiosks FOR SELECT
USING (true);

CREATE POLICY "Admins can manage kiosks"
ON public.kiosks FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update waste_requests table
ALTER TABLE public.waste_requests DROP COLUMN cost_pkr;
ALTER TABLE public.waste_requests ADD COLUMN reward_pkr NUMERIC DEFAULT 20 NOT NULL;
ALTER TABLE public.waste_requests ADD COLUMN before_photo_url TEXT;
ALTER TABLE public.waste_requests ADD COLUMN after_photo_url TEXT;
ALTER TABLE public.waste_requests ADD COLUMN verified_by UUID REFERENCES auth.users(id);
ALTER TABLE public.waste_requests ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.waste_requests ADD COLUMN verification_status TEXT DEFAULT 'pending';

-- Update team_earnings structure
ALTER TABLE public.team_earnings ADD COLUMN payment_amount NUMERIC NOT NULL DEFAULT 250;

-- Update RLS policies for waste_requests to use new role system
DROP POLICY IF EXISTS "Citizens can view own requests" ON public.waste_requests;
DROP POLICY IF EXISTS "Teams and admins can update requests" ON public.waste_requests;

CREATE POLICY "Users can view relevant requests"
ON public.waste_requests FOR SELECT
USING (
  auth.uid() = citizen_id 
  OR auth.uid() = assigned_team_id 
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'team_leader')
  OR public.has_role(auth.uid(), 'team_member')
);

CREATE POLICY "Teams and admins can update requests"
ON public.waste_requests FOR UPDATE
USING (
  auth.uid() = assigned_team_id 
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'team_leader')
);

-- Function to handle citizen reward after verification
CREATE OR REPLACE FUNCTION public.process_waste_request_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status = 'approved' AND OLD.verification_status != 'approved' THEN
    -- Credit citizen wallet
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + NEW.reward_pkr
    WHERE id = NEW.citizen_id;
    
    -- Record transaction
    INSERT INTO public.wallet_transactions (user_id, amount_pkr, transaction_type, description, related_id)
    VALUES (NEW.citizen_id, NEW.reward_pkr, 'waste_reward', 'Waste pickup reward', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_waste_request_verified
AFTER UPDATE ON public.waste_requests
FOR EACH ROW
EXECUTE FUNCTION public.process_waste_request_reward();

-- Function to handle team payments after task completion
CREATE OR REPLACE FUNCTION public.process_team_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  leader_id UUID;
  team_role app_role;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get team leader
    leader_id := NEW.assigned_team_id;
    
    -- Pay team leader 500 PKR
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + 500
    WHERE id = leader_id;
    
    INSERT INTO public.wallet_transactions (user_id, amount_pkr, transaction_type, description, related_id)
    VALUES (leader_id, 500, 'team_payment', 'Team leader payment', NEW.id);
    
    -- Record in team_earnings
    INSERT INTO public.team_earnings (team_member_id, waste_request_id, amount_pkr, is_leader, payment_amount)
    VALUES (leader_id, NEW.id, 500, true, 500);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_completed
AFTER UPDATE ON public.waste_requests
FOR EACH ROW
EXECUTE FUNCTION public.process_team_payments();

-- Function to handle recycling rewards
CREATE OR REPLACE FUNCTION public.process_recycling_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Credit citizen wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + NEW.reward_pkr
  WHERE id = NEW.citizen_id;
  
  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, amount_pkr, transaction_type, description, related_id)
  VALUES (NEW.citizen_id, NEW.reward_pkr, 'recycling_reward', 'Recycling reward', NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_recycling_transaction_created
AFTER INSERT ON public.recycling_transactions
FOR EACH ROW
EXECUTE FUNCTION public.process_recycling_reward();