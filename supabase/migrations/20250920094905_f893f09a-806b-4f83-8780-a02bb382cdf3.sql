-- Fix function security issues by setting proper search_path

-- Update handle_new_user function with proper security settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'seller', 'buyer', 'agent') 
      THEN (NEW.raw_user_meta_data->>'role')::public.business_role
      ELSE 'buyer'::public.business_role
    END
  );
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column function with proper security settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;