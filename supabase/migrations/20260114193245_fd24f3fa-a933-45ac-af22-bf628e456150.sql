-- Improve find_random_call_match function with automatic cleanup and better matching
CREATE OR REPLACE FUNCTION public.find_random_call_match(p_user_id uuid, p_user_gender text, p_looking_for text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_match_id UUID;
  v_session_id UUID;
BEGIN
  -- Auto-cleanup: remove stale entries (older than 2 minutes or already matched)
  DELETE FROM random_call_queue 
  WHERE created_at < now() - interval '2 minutes'
     OR status = 'matched';

  -- Find a compatible match (excluding self and recently matched users)
  SELECT user_id INTO v_match_id
  FROM random_call_queue
  WHERE user_id != p_user_id
    AND status = 'waiting'
    -- Exclude users who have an active session in the last 30 seconds
    AND NOT EXISTS (
      SELECT 1 FROM random_call_sessions rcs
      WHERE (rcs.user1_id = random_call_queue.user_id OR rcs.user2_id = random_call_queue.user_id)
        AND rcs.status = 'active'
        AND rcs.created_at > now() - interval '30 seconds'
    )
    -- Match preferences: p_looking_for is what current user wants
    AND (
      (p_looking_for = 'tous') OR 
      (p_looking_for = 'homme' AND gender = 'homme') OR
      (p_looking_for = 'femme' AND gender = 'femme') OR
      (p_looking_for = 'lgbt' AND gender = 'lgbt')
    )
    -- The other user must also want to match with us based on our gender
    AND (
      (looking_for = 'tous') OR
      (looking_for = 'homme' AND p_user_gender = 'homme') OR
      (looking_for = 'femme' AND p_user_gender = 'femme') OR
      (looking_for = 'lgbt' AND p_user_gender = 'lgbt')
    )
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_match_id IS NOT NULL THEN
    -- Update both users' status to matched
    UPDATE random_call_queue SET status = 'matched' WHERE user_id IN (p_user_id, v_match_id);
    
    -- Create session with consistent user ordering
    INSERT INTO random_call_sessions (user1_id, user2_id, status)
    VALUES (LEAST(p_user_id, v_match_id), GREATEST(p_user_id, v_match_id), 'active')
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
  END IF;
  
  RETURN NULL;
END;
$function$;