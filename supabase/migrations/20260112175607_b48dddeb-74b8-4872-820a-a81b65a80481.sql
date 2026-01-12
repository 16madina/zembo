-- Add phone column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- Create unique index on email (allows nulls)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique 
ON public.profiles (email) 
WHERE email IS NOT NULL;

-- Create unique index on phone (allows nulls)  
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique 
ON public.profiles (phone) 
WHERE phone IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.phone IS 'User phone number with country code, must be unique';