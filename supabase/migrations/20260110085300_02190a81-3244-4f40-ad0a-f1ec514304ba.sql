-- Add occupation, education and height columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS height TEXT;