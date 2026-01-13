-- Add latitude and longitude columns to profiles for real distance calculation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_profiles_geolocation ON public.profiles (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;