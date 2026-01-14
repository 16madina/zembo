-- Create a function to grant 100 welcome coins to new users
CREATE OR REPLACE FUNCTION public.grant_welcome_coins()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert 100 welcome coins for the new user
  INSERT INTO public.user_coins (user_id, balance, total_earned)
  VALUES (NEW.user_id, 100, 100)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically grant coins when a new profile is created
DROP TRIGGER IF EXISTS grant_welcome_coins_trigger ON public.profiles;
CREATE TRIGGER grant_welcome_coins_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_welcome_coins();