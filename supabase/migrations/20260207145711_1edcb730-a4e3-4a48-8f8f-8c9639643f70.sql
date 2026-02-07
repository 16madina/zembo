-- Create a new function for interest-based matching (non-random, compliant with App Store)
-- This replaces random matching with interest-based scoring

CREATE OR REPLACE FUNCTION public.zconnect_find_interest_match(
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
  v_user_interests text[];
  v_match record;
  v_session record;
  v_room_name text;
  v_existing_queue record;
  v_best_match record;
  v_shared_interests text[];
  v_max_shared_count int := 0;
BEGIN
  -- 0) Get current user's interests
  SELECT interests INTO v_user_interests
  FROM public.profiles
  WHERE user_id = p_user_id;

  -- 1) Cleanup stale sessions
  UPDATE public.random_call_sessions
  SET status = 'completed'
  WHERE status = 'active'
    AND (
      room_name IS NULL
      OR ends_at < now()
      OR created_at < now() - interval '10 minutes'
    );

  -- 2) Cleanup stale queue entries
  DELETE FROM public.random_call_queue
  WHERE last_heartbeat < now() - interval '2 minutes';

  -- 3) Check for existing active session
  SELECT id, room_name, user1_id, user2_id
  INTO v_session
  FROM public.random_call_sessions
  WHERE status = 'active'
    AND room_name IS NOT NULL
    AND (user1_id = p_user_id OR user2_id = p_user_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_session.id IS NOT NULL THEN
    -- Get shared interests for display
    SELECT array_agg(i) INTO v_shared_interests
    FROM unnest(v_user_interests) i
    WHERE i = ANY(
      SELECT unnest(p.interests)
      FROM profiles p
      WHERE p.user_id = CASE WHEN v_session.user1_id = p_user_id THEN v_session.user2_id ELSE v_session.user1_id END
    );

    RETURN jsonb_build_object(
      'action', 'matched',
      'room_name', v_session.room_name,
      'session_id', v_session.id,
      'matched_user_id', CASE WHEN v_session.user1_id = p_user_id THEN v_session.user2_id ELSE v_session.user1_id END,
      'shared_interests', COALESCE(v_shared_interests, ARRAY[]::text[])
    );
  END IF;

  -- 4) Check if already matched in queue
  SELECT * INTO v_existing_queue
  FROM public.random_call_queue
  WHERE user_id = p_user_id;

  IF v_existing_queue IS NOT NULL AND v_existing_queue.status = 'matched' AND v_existing_queue.room_name IS NOT NULL THEN
    SELECT id, user1_id, user2_id INTO v_session
    FROM public.random_call_sessions
    WHERE room_name = v_existing_queue.room_name AND status = 'active'
    LIMIT 1;

    IF v_session.id IS NOT NULL THEN
      -- Get shared interests
      SELECT array_agg(i) INTO v_shared_interests
      FROM unnest(v_user_interests) i
      WHERE i = ANY(
        SELECT unnest(p.interests)
        FROM profiles p
        WHERE p.user_id = CASE WHEN v_session.user1_id = p_user_id THEN v_session.user2_id ELSE v_session.user1_id END
      );

      RETURN jsonb_build_object(
        'action', 'matched',
        'room_name', v_existing_queue.room_name,
        'session_id', v_session.id,
        'matched_user_id', CASE WHEN v_session.user1_id = p_user_id THEN v_session.user2_id ELSE v_session.user1_id END,
        'shared_interests', COALESCE(v_shared_interests, ARRAY[]::text[])
      );
    END IF;
  END IF;

  -- 5) UPSERT into queue
  INSERT INTO public.random_call_queue (user_id, gender, looking_for, status, room_name, created_at, last_heartbeat)
  VALUES (p_user_id, p_user_gender, p_looking_for, 'waiting', NULL, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    gender = EXCLUDED.gender,
    looking_for = EXCLUDED.looking_for,
    last_heartbeat = now(),
    created_at = CASE
      WHEN random_call_queue.status IN ('cancelled', 'matched') THEN now()
      ELSE random_call_queue.created_at
    END,
    status = CASE
      WHEN random_call_queue.status = 'matched' AND random_call_queue.room_name IS NOT NULL
        THEN random_call_queue.status
      ELSE 'waiting'
    END,
    room_name = CASE
      WHEN random_call_queue.status = 'matched' AND random_call_queue.room_name IS NOT NULL
        THEN random_call_queue.room_name
      ELSE NULL
    END;

  -- 6) Find BEST match based on shared interests (NOT random)
  FOR v_match IN
    SELECT 
      q.*,
      p.interests as match_interests,
      (
        SELECT COUNT(*)
        FROM unnest(v_user_interests) ui
        WHERE ui = ANY(p.interests)
      ) as shared_count
    FROM public.random_call_queue q
    JOIN public.profiles p ON p.user_id = q.user_id
    WHERE q.user_id != p_user_id
      AND q.status = 'waiting'
      AND q.room_name IS NULL
      -- Gender preference matching
      AND (
        p_looking_for = 'tous' OR 
        (p_looking_for = 'homme' AND q.gender IN ('homme', 'homme_gay')) OR
        (p_looking_for = 'femme' AND q.gender IN ('femme', 'femme_lesbienne')) OR
        (p_looking_for = 'lgbt' AND q.gender IN ('homme_gay', 'femme_lesbienne', 'non_binaire', 'autre_lgbt'))
      )
      AND (
        q.looking_for = 'tous' OR
        (q.looking_for = 'homme' AND p_user_gender IN ('homme', 'homme_gay')) OR
        (q.looking_for = 'femme' AND p_user_gender IN ('femme', 'femme_lesbienne')) OR
        (q.looking_for = 'lgbt' AND p_user_gender IN ('homme_gay', 'femme_lesbienne', 'non_binaire', 'autre_lgbt'))
      )
    ORDER BY shared_count DESC, q.created_at ASC
    LIMIT 1
    FOR UPDATE OF q SKIP LOCKED
  LOOP
    v_best_match := v_match;
    v_max_shared_count := v_match.shared_count;
  END LOOP;

  -- If no match found, return waiting status
  IF v_best_match IS NULL THEN
    RETURN jsonb_build_object(
      'action', 'waiting',
      'queue_id', (SELECT id FROM public.random_call_queue WHERE user_id = p_user_id)
    );
  END IF;

  -- 7) Get shared interests array
  SELECT array_agg(i) INTO v_shared_interests
  FROM unnest(v_user_interests) i
  WHERE i = ANY(v_best_match.match_interests);

  -- 8) Create room and session
  v_room_name := 'zconnect_' || gen_random_uuid()::text;

  INSERT INTO public.random_call_sessions (
    user1_id, 
    user2_id, 
    room_name, 
    status, 
    started_at, 
    ends_at
  )
  VALUES (
    p_user_id, 
    v_best_match.user_id, 
    v_room_name, 
    'active', 
    now(), 
    now() + interval '90 seconds'
  )
  RETURNING id INTO v_session;

  -- 9) Update both queue entries
  UPDATE public.random_call_queue
  SET status = 'matched', room_name = v_room_name
  WHERE user_id IN (p_user_id, v_best_match.user_id);

  RETURN jsonb_build_object(
    'action', 'matched',
    'room_name', v_room_name,
    'session_id', v_session.id,
    'matched_user_id', v_best_match.user_id,
    'shared_interests', COALESCE(v_shared_interests, ARRAY[]::text[]),
    'shared_count', v_max_shared_count
  );
END;
$$;