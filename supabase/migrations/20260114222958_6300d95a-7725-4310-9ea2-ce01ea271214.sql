-- Make random call matching idempotent and enable realtime updates

-- 1) Ensure realtime publication includes needed tables (safe/conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'random_call_queue'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.random_call_queue;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'random_call_sessions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.random_call_sessions;
    END IF;
  END IF;
END $$;

-- 2) Heartbeat RPC (prevents stale cleanup issues during long/paused searches)
CREATE OR REPLACE FUNCTION public.random_call_heartbeat(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.random_call_queue
  SET created_at = now()
  WHERE user_id = p_user_id
    AND status = 'waiting';

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 3) Update RPC to be safe to poll (won't reset a matched user back to waiting)
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
  v_existing_queue record;
  v_existing_session record;
  v_match record;
  v_room_name text;
  v_session_id uuid;
BEGIN
  -- Clean up stale queue entries (keep generous window; heartbeat maintains fresh ones)
  DELETE FROM public.random_call_queue
  WHERE created_at < now() - interval '10 minutes';

  -- If there's already an active session for this user, return it (idempotent)
  SELECT id, room_name, user1_id, user2_id
  INTO v_existing_session
  FROM public.random_call_sessions
  WHERE status = 'active'
    AND (user1_id = p_user_id OR user2_id = p_user_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_session.id IS NOT NULL AND v_existing_session.room_name IS NOT NULL THEN
    RETURN jsonb_build_object(
      'action', 'matched',
      'room_name', v_existing_session.room_name,
      'session_id', v_existing_session.id,
      'matched_user_id', CASE WHEN v_existing_session.user1_id = p_user_id THEN v_existing_session.user2_id ELSE v_existing_session.user1_id END
    );
  END IF;

  -- UPSERT our queue entry, but DO NOT overwrite an already-matched row
  INSERT INTO public.random_call_queue (user_id, gender, looking_for, status, room_name, created_at)
  VALUES (p_user_id, p_user_gender, p_looking_for, 'waiting', NULL, now())
  ON CONFLICT (user_id) DO UPDATE SET
    gender = EXCLUDED.gender,
    looking_for = EXCLUDED.looking_for,
    status = CASE
      WHEN public.random_call_queue.status = 'matched' AND public.random_call_queue.room_name IS NOT NULL
        THEN public.random_call_queue.status
      ELSE 'waiting'
    END,
    room_name = CASE
      WHEN public.random_call_queue.status = 'matched' AND public.random_call_queue.room_name IS NOT NULL
        THEN public.random_call_queue.room_name
      ELSE NULL
    END,
    created_at = now();

  -- If we are already matched (e.g., the other user matched us first), return that
  SELECT * INTO v_existing_queue
  FROM public.random_call_queue
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_existing_queue.status = 'matched' AND v_existing_queue.room_name IS NOT NULL THEN
    SELECT id, user1_id, user2_id
    INTO v_existing_session
    FROM public.random_call_sessions
    WHERE room_name = v_existing_queue.room_name
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'action', 'matched',
      'room_name', v_existing_queue.room_name,
      'session_id', v_existing_session.id,
      'matched_user_id', CASE WHEN v_existing_session.user1_id = p_user_id THEN v_existing_session.user2_id ELSE v_existing_session.user1_id END
    );
  END IF;

  -- Find a compatible waiting match
  SELECT * INTO v_match
  FROM public.random_call_queue
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
    AND NOT EXISTS (
      SELECT 1 FROM public.random_call_sessions rcs
      WHERE rcs.status = 'active'
        AND (rcs.user1_id = public.random_call_queue.user_id OR rcs.user2_id = public.random_call_queue.user_id)
    )
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_match IS NOT NULL THEN
    v_room_name := 'random-call-' || gen_random_uuid()::text;

    INSERT INTO public.random_call_sessions (user1_id, user2_id, status, room_name)
    VALUES (
      LEAST(p_user_id, v_match.user_id),
      GREATEST(p_user_id, v_match.user_id),
      'active',
      v_room_name
    )
    RETURNING id INTO v_session_id;

    UPDATE public.random_call_queue
    SET status = 'matched', room_name = v_room_name
    WHERE user_id IN (p_user_id, v_match.user_id);

    RETURN jsonb_build_object(
      'action', 'matched',
      'room_name', v_room_name,
      'session_id', v_session_id,
      'matched_user_id', v_match.user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'action', 'waiting',
    'queue_id', (SELECT id FROM public.random_call_queue WHERE user_id = p_user_id)
  );
END;
$function$;
