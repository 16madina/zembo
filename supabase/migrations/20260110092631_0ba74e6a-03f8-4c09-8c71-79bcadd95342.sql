-- Add columns to track email verification rate limiting
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_email_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_email_count_reset_at timestamp with time zone DEFAULT now();