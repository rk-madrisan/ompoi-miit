-- Clean up existing tables for fresh start
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS specializations CASCADE;
DROP TABLE IF EXISTS specialties CASCADE;

-- Keep profiles table but modify it for the business application
-- First drop existing trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Modify profiles table for business use
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- Create new enum for business roles
CREATE TYPE public.business_role AS ENUM ('admin', 'seller', 'buyer', 'agent');

-- Add new columns for business application
ALTER TABLE public.profiles 
ADD COLUMN role public.business_role DEFAULT 'buyer',
ADD COLUMN business_name TEXT,
ADD COLUMN address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN pincode TEXT,
ADD COLUMN gst_number TEXT,
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Recreate the updated_at trigger
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies for business application
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new RLS policies
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);