-- Update find_random_call_match function with UPSERT and session check
CREATE OR REPLACE FUNCTION public.find_random_call_match(
  p_user_id uuid, 
  p_user_gender text, 
  p_looking_for text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_match_id UUID;
  v_session_id UUID;
  v_existing_session_id UUID;
BEGIN
  -- Nettoyer les sessions expirées
  UPDATE random_call_sessions
  SET status = 'completed'
  WHERE status = 'active'
    AND ends_at < now();

  -- Vérifier si une session existe déjà pour cet utilisateur
  SELECT id INTO v_existing_session_id
  FROM random_call_sessions
  WHERE (user1_id = p_user_id OR user2_id = p_user_id)
    AND status = 'active'
    AND created_at > now() - interval '2 minutes';
  
  IF v_existing_session_id IS NOT NULL THEN
    DELETE FROM random_call_queue WHERE user_id = p_user_id;
    RETURN v_existing_session_id;
  END IF;

  -- Nettoyer les anciennes entrées
  DELETE FROM random_call_queue 
  WHERE created_at < now() - interval '2 minutes';

  -- S'assurer que l'utilisateur est dans la queue (UPSERT)
  INSERT INTO random_call_queue (user_id, gender, looking_for, status, created_at)
  VALUES (p_user_id, p_user_gender, p_looking_for, 'waiting', now())
  ON CONFLICT (user_id) DO UPDATE SET
    looking_for = EXCLUDED.looking_for,
    gender = EXCLUDED.gender,
    status = 'waiting',
    created_at = now();

  -- Chercher un partenaire compatible
  SELECT user_id INTO v_match_id
  FROM random_call_queue
  WHERE user_id != p_user_id
    AND status = 'waiting'
    AND NOT EXISTS (
      SELECT 1 FROM random_call_sessions rcs
      WHERE (rcs.user1_id = random_call_queue.user_id OR rcs.user2_id = random_call_queue.user_id)
        AND rcs.status = 'active'
        AND rcs.created_at > now() - interval '30 seconds'
    )
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

  IF v_match_id IS NOT NULL THEN
    UPDATE random_call_queue SET status = 'matched' WHERE user_id IN (p_user_id, v_match_id);
    
    INSERT INTO random_call_sessions (user1_id, user2_id, status)
    VALUES (LEAST(p_user_id, v_match_id), GREATEST(p_user_id, v_match_id), 'active')
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
  END IF;
  
  RETURN NULL;
END;
$function$;