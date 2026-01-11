-- Add fcm_token column to profiles table for storing push notification tokens
ALTER TABLE public.profiles
ADD COLUMN fcm_token text;

-- Add an index for faster lookup when sending notifications
CREATE INDEX idx_profiles_fcm_token ON public.profiles(fcm_token) WHERE fcm_token IS NOT NULL;