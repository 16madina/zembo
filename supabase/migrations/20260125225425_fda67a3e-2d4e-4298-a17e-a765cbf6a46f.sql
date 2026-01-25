-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Participants can view session participants" ON public.speed_dating_participants;

-- Create a simpler, non-recursive policy
-- Allow authenticated users to view all participants in sessions they are part of
CREATE POLICY "Users can view participants in their sessions" 
ON public.speed_dating_participants 
FOR SELECT 
USING (
  session_id IN (
    SELECT session_id FROM public.speed_dating_participants 
    WHERE user_id = auth.uid()
  )
);