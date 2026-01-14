-- Add UNIQUE constraint on user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'random_call_queue_user_id_key'
  ) THEN
    ALTER TABLE random_call_queue 
    ADD CONSTRAINT random_call_queue_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Update random_call_find_or_create_match to use atomic UPSERT (no race condition)
CREATE OR REPLACE FUNCTION public.random_call_find_or_create_match(
  p_user_id uuid, 
  p_user_gender text, 
  p_looking_for text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_match record;
  v_room_name text;
  v_session_id uuid;
BEGIN
  -- Clean up stale entries (older than 3 minutes)
  DELETE FROM random_call_queue 
  WHERE created_at < now() - interval '3 minutes';

  -- UPSERT FIRST: Insert or update the user's queue entry atomically
  -- This ensures user is ALWAYS in queue before we search for matches
  INSERT INTO random_call_queue (user_id, gender, looking_for, status, created_at)
  VALUES (p_user_id, p_user_gender, p_looking_for, 'waiting', now())
  ON CONFLICT (user_id) DO UPDATE SET
    gender = EXCLUDED.gender,
    looking_for = EXCLUDED.looking_for,
    status = 'waiting',
    room_name = NULL,
    created_at = now();

  -- Now try to find a compatible match (excluding ourselves)
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
    
    -- Update BOTH users' queue entries to matched
    UPDATE random_call_queue
    SET status = 'matched', room_name = v_room_name
    WHERE user_id IN (p_user_id, v_match.user_id);
    
    RETURN jsonb_build_object(
      'action', 'matched',
      'room_name', v_room_name,
      'session_id', v_session_id,
      'matched_user_id', v_match.user_id
    );
  END IF;
  
  -- No match found, user is already in queue with 'waiting' status
  RETURN jsonb_build_object(
    'action', 'waiting',
    'queue_id', (SELECT id FROM random_call_queue WHERE user_id = p_user_id)
  );
END;
$function$;