-- Add has_rose column to likes table to track rose gifts
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS has_rose boolean DEFAULT false;

-- Create index for faster queries on roses
CREATE INDEX IF NOT EXISTS idx_likes_has_rose ON public.likes(has_rose) WHERE has_rose = true;