-- Add is_join_gift column to virtual_gifts
ALTER TABLE public.virtual_gifts 
ADD COLUMN is_join_gift boolean NOT NULL DEFAULT false;

-- Insert the 3 special "Join Live" gifts
INSERT INTO public.virtual_gifts (name, emoji, price_coins, animation_type, is_join_gift, is_active)
VALUES 
  ('Ticket', '🎫', 15, 'ticket', true, true),
  ('Passe VIP', '🎟️', 30, 'pass', true, true),
  ('Accès Backstage', '🌟', 50, 'backstage', true, true);

-- Create live_access table to track who has access to which live
CREATE TABLE public.live_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  gift_id UUID REFERENCES public.virtual_gifts(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(live_id, user_id)
);

-- Enable RLS
ALTER TABLE public.live_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_access
CREATE POLICY "Users can view their own access"
ON public.live_access
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own access"
ON public.live_access
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Streamers can view access to their lives"
ON public.live_access
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lives
    WHERE lives.id = live_access.live_id
    AND lives.streamer_id = auth.uid()
  )
);

-- Function to check if user can access a live
CREATE OR REPLACE FUNCTION public.can_access_live(p_user_id uuid, p_live_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- User is the streamer
    EXISTS (SELECT 1 FROM lives WHERE id = p_live_id AND streamer_id = p_user_id)
    OR
    -- User has Premium/VIP subscription
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = p_user_id
      AND tier IN ('premium', 'vip')
      AND is_active = true
    )
    OR
    -- User has sent a join gift
    EXISTS (
      SELECT 1 FROM live_access
      WHERE live_id = p_live_id AND user_id = p_user_id
    );
$$;

-- Enable realtime for live_access
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_access;