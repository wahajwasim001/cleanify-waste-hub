-- Fix Input Validation Issues
-- Add database constraints to prevent invalid data

-- Constraints for waste_requests
ALTER TABLE waste_requests 
  ADD CONSTRAINT valid_bags CHECK (number_of_bags > 0 AND number_of_bags <= 100),
  ADD CONSTRAINT valid_reward CHECK (reward_pkr >= 0 AND reward_pkr <= 10000);

-- Constraints for recycling_transactions
ALTER TABLE recycling_transactions
  ADD CONSTRAINT valid_bottles CHECK (bottles >= 0 AND bottles <= 1000),
  ADD CONSTRAINT valid_cans CHECK (cans >= 0 AND cans <= 1000),
  ADD CONSTRAINT valid_total_items CHECK (total_items >= 0 AND total_items <= 2000),
  ADD CONSTRAINT valid_recycling_reward CHECK (reward_pkr >= 0 AND reward_pkr <= 50000);

-- Create server-side reward calculation for recycling
CREATE OR REPLACE FUNCTION calculate_recycling_reward()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total items
  NEW.total_items := COALESCE(NEW.bottles, 0) + COALESCE(NEW.cans, 0);
  -- Calculate reward: 5 PKR per item
  NEW.reward_pkr := NEW.total_items * 5;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_recycling_reward
BEFORE INSERT ON recycling_transactions
FOR EACH ROW EXECUTE FUNCTION calculate_recycling_reward();

-- Create server-side reward calculation for waste requests
CREATE OR REPLACE FUNCTION calculate_waste_reward()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate reward: 20 PKR per bag
  NEW.reward_pkr := NEW.number_of_bags * 20;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_waste_reward
BEFORE INSERT ON waste_requests
FOR EACH ROW EXECUTE FUNCTION calculate_waste_reward();

-- Fix Duplicate Role Storage Issue
-- First, update policies that reference profiles.role

-- Drop and recreate recycling_transactions policies without profile.role dependency
DROP POLICY IF EXISTS "Citizens can view own transactions" ON recycling_transactions;
CREATE POLICY "Citizens can view own transactions"
ON recycling_transactions FOR SELECT
USING (
  auth.uid() = citizen_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Drop and recreate payments policies without profile.role dependency
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments"
ON payments FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Drop and recreate team_earnings policies without profile.role dependency
DROP POLICY IF EXISTS "Team members can view own earnings" ON team_earnings;
CREATE POLICY "Team members can view own earnings"
ON team_earnings FOR SELECT
USING (
  auth.uid() = team_member_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Now we can safely remove role column from profiles table
ALTER TABLE public.profiles DROP COLUMN role;

-- Update handle_new_user trigger to not set role in profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile without role
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  -- Insert default citizen role into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;