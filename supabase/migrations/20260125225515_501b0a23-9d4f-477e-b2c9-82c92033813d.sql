-- Drop the still-recursive policy
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON public.speed_dating_participants;

-- Create a security definer function to check if a user is in a session
CREATE OR REPLACE FUNCTION public.is_in_speed_dating_session(p_session_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.speed_dating_participants
    WHERE session_id = p_session_id
      AND user_id = p_user_id
      AND is_active = true
  )
$$;

-- Create a non-recursive SELECT policy using the function
CREATE POLICY "Users can view participants in their sessions" 
ON public.speed_dating_participants 
FOR SELECT 
USING (
  public.is_in_speed_dating_session(session_id, auth.uid())
);