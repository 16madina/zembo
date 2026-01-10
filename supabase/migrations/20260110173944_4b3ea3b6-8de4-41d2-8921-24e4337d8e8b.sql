-- Table pour la file d'attente des appels aléatoires
CREATE TABLE public.random_call_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  gender TEXT NOT NULL, -- Le genre de l'utilisateur
  looking_for TEXT NOT NULL, -- 'homme', 'femme', 'tous'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'waiting' -- 'waiting', 'matched', 'in_call'
);

-- Table pour les sessions d'appels aléatoires
CREATE TABLE public.random_call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '90 seconds'),
  user1_wants_match BOOLEAN DEFAULT NULL,
  user2_wants_match BOOLEAN DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'deciding', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.random_call_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.random_call_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for random_call_queue
CREATE POLICY "Users can insert themselves into queue" 
ON public.random_call_queue 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue entry" 
ON public.random_call_queue 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue entry" 
ON public.random_call_queue 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view queue to find matches" 
ON public.random_call_queue 
FOR SELECT 
USING (true);

-- RLS policies for random_call_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.random_call_sessions 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own sessions" 
ON public.random_call_sessions 
FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Function to find and match users in queue
CREATE OR REPLACE FUNCTION public.find_random_call_match(
  p_user_id UUID,
  p_user_gender TEXT,
  p_looking_for TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id UUID;
  v_session_id UUID;
BEGIN
  -- Find a compatible match
  SELECT user_id INTO v_match_id
  FROM random_call_queue
  WHERE user_id != p_user_id
    AND status = 'waiting'
    -- Match preferences
    AND (
      (p_looking_for = 'tous') OR 
      (p_looking_for = 'homme' AND gender = 'homme') OR
      (p_looking_for = 'femme' AND gender = 'femme') OR
      (p_looking_for = 'lgbt' AND gender = 'lgbt')
    )
    -- The other user must also want to match with us
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
    -- Update both users' status
    UPDATE random_call_queue SET status = 'matched' WHERE user_id IN (p_user_id, v_match_id);
    
    -- Create session
    INSERT INTO random_call_sessions (user1_id, user2_id)
    VALUES (LEAST(p_user_id, v_match_id), GREATEST(p_user_id, v_match_id))
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Function to submit match decision
CREATE OR REPLACE FUNCTION public.submit_random_call_decision(
  p_session_id UUID,
  p_user_id UUID,
  p_wants_match BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_both_want_match BOOLEAN := FALSE;
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
    UPDATE random_call_sessions SET user1_wants_match = p_wants_match, status = 'deciding' WHERE id = p_session_id;
  ELSIF v_session.user2_id = p_user_id THEN
    UPDATE random_call_sessions SET user2_wants_match = p_wants_match, status = 'deciding' WHERE id = p_session_id;
  ELSE
    RETURN jsonb_build_object('error', 'User not in session');
  END IF;
  
  -- Re-fetch to check if both have decided
  SELECT * INTO v_session FROM random_call_sessions WHERE id = p_session_id;
  
  IF v_session.user1_wants_match IS NOT NULL AND v_session.user2_wants_match IS NOT NULL THEN
    -- Both have decided
    UPDATE random_call_sessions SET status = 'completed' WHERE id = p_session_id;
    
    IF v_session.user1_wants_match AND v_session.user2_wants_match THEN
      -- Create a match!
      INSERT INTO matches (user1_id, user2_id)
      VALUES (v_session.user1_id, v_session.user2_id)
      ON CONFLICT DO NOTHING;
      
      RETURN jsonb_build_object('matched', true, 'completed', true);
    ELSE
      RETURN jsonb_build_object('matched', false, 'completed', true);
    END IF;
  END IF;
  
  -- Waiting for other user
  RETURN jsonb_build_object('waiting', true, 'completed', false);
END;
$$;

-- Enable realtime for queue and sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.random_call_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.random_call_sessions;