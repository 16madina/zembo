-- Add room_name column to random_call_queue for LiveKit integration
ALTER TABLE public.random_call_queue 
ADD COLUMN IF NOT EXISTS room_name text;

-- Add room_name column to random_call_sessions for LiveKit room tracking
ALTER TABLE public.random_call_sessions 
ADD COLUMN IF NOT EXISTS room_name text;

-- Drop old RLS policies and recreate with proper restrictions
DROP POLICY IF EXISTS "Users can view queue to find matches" ON public.random_call_queue;
DROP POLICY IF EXISTS "Users can insert themselves into queue" ON public.random_call_queue;
DROP POLICY IF EXISTS "Users can update their own queue entry" ON public.random_call_queue;
DROP POLICY IF EXISTS "Users can delete their own queue entry" ON public.random_call_queue;

-- Users can only see their own queue entry (important for realtime privacy)
CREATE POLICY "Users can view their own queue entry"
ON public.random_call_queue FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert themselves
CREATE POLICY "Users can insert themselves into queue"
ON public.random_call_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own entry
CREATE POLICY "Users can update their own queue entry"
ON public.random_call_queue FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own entry
CREATE POLICY "Users can delete their own queue entry"
ON public.random_call_queue FOR DELETE
USING (auth.uid() = user_id);

-- Create the atomic RPC function for matching
CREATE OR REPLACE FUNCTION public.random_call_find_or_create_match(
  p_user_id uuid,
  p_user_gender text,
  p_looking_for text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match record;
  v_room_name text;
  v_session_id uuid;
  v_existing_entry record;
BEGIN
  -- Check if user already has an active queue entry
  SELECT * INTO v_existing_entry
  FROM random_call_queue
  WHERE user_id = p_user_id AND status IN ('waiting', 'matched')
  LIMIT 1;
  
  IF v_existing_entry IS NOT NULL THEN
    -- Already in queue
    IF v_existing_entry.status = 'matched' AND v_existing_entry.room_name IS NOT NULL THEN
      RETURN jsonb_build_object(
        'action', 'matched',
        'room_name', v_existing_entry.room_name,
        'queue_id', v_existing_entry.id
      );
    END IF;
    RETURN jsonb_build_object(
      'action', 'waiting',
      'queue_id', v_existing_entry.id
    );
  END IF;

  -- Clean up stale entries (older than 3 minutes)
  DELETE FROM random_call_queue 
  WHERE created_at < now() - interval '3 minutes'
    OR status IN ('cancelled', 'completed');

  -- Try to find a compatible match
  SELECT * INTO v_match
  FROM random_call_queue
  WHERE user_id != p_user_id
    AND status = 'waiting'
    AND (
      (p_looking_for = 'tous') OR 
      (p_looking_for = 'homme' AND gender = 'homme') OR
      (p_looking_for = 'femme' AND gender = 'femme') OR
      (p_looking_for = 'lgbt' AND gender = 'lgbt')
    )
    AND (
      (looking_for = 'tous') OR
      (looking_for = 'homme' AND p_user_gender = 'homme') OR
      (looking_for = 'femme' AND p_user_gender = 'femme') OR
      (looking_for = 'lgbt' AND p_user_gender = 'lgbt')
    )
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_match IS NOT NULL THEN
    -- Generate unique room name
    v_room_name := 'random-call-' || gen_random_uuid()::text;
    
    -- Create session
    INSERT INTO random_call_sessions (user1_id, user2_id, status, room_name)
    VALUES (
      LEAST(p_user_id, v_match.user_id),
      GREATEST(p_user_id, v_match.user_id),
      'active',
      v_room_name
    )
    RETURNING id INTO v_session_id;
    
    -- Update the matched user's queue entry
    UPDATE random_call_queue
    SET status = 'matched', room_name = v_room_name
    WHERE id = v_match.id;
    
    -- Insert current user as matched (so they don't get double-matched)
    INSERT INTO random_call_queue (user_id, gender, looking_for, status, room_name)
    VALUES (p_user_id, p_user_gender, p_looking_for, 'matched', v_room_name);
    
    RETURN jsonb_build_object(
      'action', 'matched',
      'room_name', v_room_name,
      'session_id', v_session_id,
      'matched_user_id', v_match.user_id
    );
  ELSE
    -- No match found, add to queue
    INSERT INTO random_call_queue (user_id, gender, looking_for, status)
    VALUES (p_user_id, p_user_gender, p_looking_for, 'waiting')
    RETURNING id INTO v_session_id;
    
    RETURN jsonb_build_object(
      'action', 'waiting',
      'queue_id', v_session_id
    );
  END IF;
END;
$$;

-- Function to cancel a random call search
CREATE OR REPLACE FUNCTION public.random_call_cancel(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE random_call_queue
  SET status = 'cancelled'
  WHERE user_id = p_user_id AND status = 'waiting';
  
  RETURN jsonb_build_object('success', true);
END;
$$;