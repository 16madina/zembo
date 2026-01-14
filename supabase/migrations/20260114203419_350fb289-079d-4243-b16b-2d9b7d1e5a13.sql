-- Drop and recreate the function with better cleanup logic
CREATE OR REPLACE FUNCTION public.random_call_find_or_create_match(p_user_id uuid, p_user_gender text, p_looking_for text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match record;
  v_room_name text;
  v_session_id uuid;
BEGIN
  -- First, clean up any existing entry for this user (prevent duplicates)
  DELETE FROM random_call_queue WHERE user_id = p_user_id;

  -- Clean up stale entries (older than 3 minutes)
  DELETE FROM random_call_queue 
  WHERE created_at < now() - interval '3 minutes';

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
    
    -- Insert current user as matched
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