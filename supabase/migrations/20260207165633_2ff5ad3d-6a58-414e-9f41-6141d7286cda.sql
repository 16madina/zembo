-- Create table to track daily skips for Z Connect
CREATE TABLE public.daily_skips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  skip_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skip_date)
);

-- Enable RLS
ALTER TABLE public.daily_skips ENABLE ROW LEVEL SECURITY;

-- Users can view their own skip counts
CREATE POLICY "Users can view their own skips"
ON public.daily_skips
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own skip records
CREATE POLICY "Users can insert their own skips"
ON public.daily_skips
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own skip counts
CREATE POLICY "Users can update their own skips"
ON public.daily_skips
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_skips_updated_at
BEFORE UPDATE ON public.daily_skips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();