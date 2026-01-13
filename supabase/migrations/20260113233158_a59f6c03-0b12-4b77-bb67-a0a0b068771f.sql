-- Update the RLS policy for live creation to allow all authenticated users
DROP POLICY IF EXISTS "Premium users can create lives" ON public.lives;

CREATE POLICY "Authenticated users can create lives" 
ON public.lives 
FOR INSERT 
WITH CHECK (auth.uid() = streamer_id);