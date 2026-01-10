-- Update random_call_sessions table to use decision strings instead of booleans
ALTER TABLE public.random_call_sessions 
  DROP COLUMN IF EXISTS user1_wants_match,
  DROP COLUMN IF EXISTS user2_wants_match;

ALTER TABLE public.random_call_sessions 
  ADD COLUMN user1_decision TEXT DEFAULT NULL,
  ADD COLUMN user2_decision TEXT DEFAULT NULL;

-- Drop and recreate the decision function
DROP FUNCTION IF EXISTS public.submit_random_call_decision(UUID, UUID, BOOLEAN);

-- Create new decision function with string decisions
CREATE OR REPLACE FUNCTION public.submit_random_call_decision(
  p_session_id UUID,
  p_user_id UUID,
  p_decision TEXT -- 'yes', 'no', 'continue'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_both_decided BOOLEAN := FALSE;
BEGIN
  -- Get and lock the session
  SELECT * INTO v_session
  FROM random_call_sessions
  WHERE id = p_session_id
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'Session not found');
  END IF;
  
  -- Update the appropriate user's decision
  IF v_session.user1_id = p_user_id THEN
    UPDATE random_call_sessions SET user1_decision = p_decision, status = 'deciding' WHERE id = p_session_id;
  ELSIF v_session.user2_id = p_user_id THEN
    UPDATE random_call_sessions SET user2_decision = p_decision, status = 'deciding' WHERE id = p_session_id;
  ELSE
    RETURN jsonb_build_object('error', 'User not in session');
  END IF;
  
  -- Re-fetch to check if both have decided
  SELECT * INTO v_session FROM random_call_sessions WHERE id = p_session_id;
  
  -- If someone said no, immediately end
  IF v_session.user1_decision = 'no' OR v_session.user2_decision = 'no' THEN
    UPDATE random_call_sessions SET status = 'completed' WHERE id = p_session_id;
    RETURN jsonb_build_object('rejected', true, 'completed', true);
  END IF;
  
  IF v_session.user1_decision IS NOT NULL AND v_session.user2_decision IS NOT NULL THEN
    -- Both have decided
    UPDATE random_call_sessions SET status = 'completed' WHERE id = p_session_id;
    
    IF v_session.user1_decision = 'yes' AND v_session.user2_decision = 'yes' THEN
      -- Create a match!
      INSERT INTO matches (user1_id, user2_id)
      VALUES (v_session.user1_id, v_session.user2_id)
      ON CONFLICT DO NOTHING;
      
      RETURN jsonb_build_object('matched', true, 'completed', true);
    ELSIF v_session.user1_decision = 'continue' OR v_session.user2_decision = 'continue' THEN
      -- At least one wants to continue
      RETURN jsonb_build_object('continued', true, 'completed', true);
    ELSE
      RETURN jsonb_build_object('matched', false, 'completed', true);
    END IF;
  END IF;
  
  -- Waiting for other user
  RETURN jsonb_build_object('waiting', true, 'completed', false);
END;
$$;