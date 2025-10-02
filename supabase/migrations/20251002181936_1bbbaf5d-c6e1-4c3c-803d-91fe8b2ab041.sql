-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('citizen', 'cleaning_team', 'admin');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'citizen',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create waste_requests table
CREATE TABLE public.waste_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  number_of_bags INTEGER NOT NULL CHECK (number_of_bags > 0),
  cost_pkr DECIMAL(10,2) NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  assigned_team_id UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recycling_transactions table
CREATE TABLE public.recycling_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bottles INTEGER DEFAULT 0 CHECK (bottles >= 0),
  cans INTEGER DEFAULT 0 CHECK (cans >= 0),
  total_items INTEGER GENERATED ALWAYS AS (bottles + cans) STORED,
  reward_pkr DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_pkr DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL, -- 'waste_pickup', 'recycling_reward', 'team_payment'
  status payment_status NOT NULL DEFAULT 'pending',
  related_id UUID, -- Reference to waste_request or recycling_transaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_earnings table
CREATE TABLE public.team_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  waste_request_id UUID NOT NULL REFERENCES public.waste_requests(id) ON DELETE CASCADE,
  amount_pkr DECIMAL(10,2) NOT NULL,
  is_leader BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycling_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_earnings ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Waste Requests RLS Policies
CREATE POLICY "Citizens can view own requests"
  ON public.waste_requests FOR SELECT
  USING (
    auth.uid() = citizen_id OR 
    auth.uid() = assigned_team_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Citizens can create own requests"
  ON public.waste_requests FOR INSERT
  WITH CHECK (auth.uid() = citizen_id);

CREATE POLICY "Teams and admins can update requests"
  ON public.waste_requests FOR UPDATE
  USING (
    auth.uid() = assigned_team_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Recycling Transactions RLS Policies
CREATE POLICY "Citizens can view own transactions"
  ON public.recycling_transactions FOR SELECT
  USING (
    auth.uid() = citizen_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Citizens can create own transactions"
  ON public.recycling_transactions FOR INSERT
  WITH CHECK (auth.uid() = citizen_id);

-- Payments RLS Policies
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

-- Team Earnings RLS Policies
CREATE POLICY "Team members can view own earnings"
  ON public.team_earnings FOR SELECT
  USING (
    auth.uid() = team_member_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can create earnings"
  ON public.team_earnings FOR INSERT
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_waste_requests_updated_at
  BEFORE UPDATE ON public.waste_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'citizen')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();