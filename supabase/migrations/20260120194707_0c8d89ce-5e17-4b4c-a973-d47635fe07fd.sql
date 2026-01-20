
-- Create table to track daily random calls
CREATE TABLE public.daily_random_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, call_date)
);

-- Enable RLS
ALTER TABLE public.daily_random_calls ENABLE ROW LEVEL SECURITY;

-- Users can view their own calls
CREATE POLICY "Users can view their own daily calls"
ON public.daily_random_calls
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own calls
CREATE POLICY "Users can insert their own daily calls"
ON public.daily_random_calls
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own calls
CREATE POLICY "Users can update their own daily calls"
ON public.daily_random_calls
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_random_calls_updated_at
BEFORE UPDATE ON public.daily_random_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_random_calls;
