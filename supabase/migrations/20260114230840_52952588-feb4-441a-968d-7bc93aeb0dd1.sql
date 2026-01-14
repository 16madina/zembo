-- Add last_heartbeat column to random_call_queue
ALTER TABLE public.random_call_queue 
ADD COLUMN IF NOT EXISTS last_heartbeat timestamptz DEFAULT now();

-- Update existing rows to have last_heartbeat = created_at
UPDATE public.random_call_queue 
SET last_heartbeat = COALESCE(last_heartbeat, created_at, now());

-- Drop and recreate functions with JSONB return type (matching existing)
DROP FUNCTION IF EXISTS public.random_call_find_or_create_match(uuid, text, text);

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
  v_session record;
  v_room_name text;
  v_existing_queue record;
BEGIN
  -- 0) Cleanup stale/invalid sessions
  UPDATE public.random_call_sessions
  SET status = 'completed'
  WHERE status = 'active'
    AND (
      room_name IS NULL
      OR ends_at < now()
      OR created_at < now() - interval '10 minutes'
    );

  -- 1) Cleanup stale queue entries based on last_heartbeat
  DELETE FROM public.random_call_queue
  WHERE last_heartbeat < now() - interval '2 minutes';

  -- 2) If there's already an active LiveKit session for this user, return it
  SELECT id, room_name, user1_id, user2_id
  INTO v_session
  FROM public.random_call_sessions
  WHERE status = 'active'
    AND room_name IS NOT NULL
    AND (user1_id = p_user_id OR user2_id = p_user_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_session.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'action', 'matched',
      'room_name', v_session.room_name,
      'session_id', v_session.id,
      'matched_user_id', CASE WHEN v_session.user1_id = p_user_id THEN v_session.user2_id ELSE v_session.user1_id END
    );
  END IF;

  -- 3) Check if user is already in queue and matched
  SELECT * INTO v_existing_queue
  FROM public.random_call_queue
  WHERE user_id = p_user_id;

  IF v_existing_queue IS NOT NULL AND v_existing_queue.status = 'matched' AND v_existing_queue.room_name IS NOT NULL THEN
    SELECT id, user1_id, user2_id INTO v_session
    FROM public.random_call_sessions
    WHERE room_name = v_existing_queue.room_name AND status = 'active'
    LIMIT 1;

    IF v_session.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'action', 'matched',
        'room_name', v_existing_queue.room_name,
        'session_id', v_session.id,
        'matched_user_id', CASE WHEN v_session.user1_id = p_user_id THEN v_session.user2_id ELSE v_session.user1_id END
      );
    END IF;
  END IF;

  -- 4) UPSERT into queue - CRITICAL: Do NOT update created_at if already waiting
  INSERT INTO public.random_call_queue (user_id, gender, looking_for, status, room_name, created_at, last_heartbeat)
  VALUES (p_user_id, p_user_gender, p_looking_for, 'waiting', NULL, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    gender = EXCLUDED.gender,
    looking_for = EXCLUDED.looking_for,
    last_heartbeat = now(),
    -- Only reset created_at if user was cancelled/matched (re-entering queue)
    created_at = CASE
      WHEN random_call_queue.status IN ('cancelled', 'matched') THEN now()
      ELSE random_call_queue.created_at
    END,
    -- Keep matched status if already matched with room
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

  -- 5) Re-check if we just got matched
  SELECT * INTO v_existing_queue
  FROM public.random_call_queue
  WHERE user_id = p_user_id;

  IF v_existing_queue.status = 'matched' AND v_existing_queue.room_name IS NOT NULL THEN
    SELECT id, user1_id, user2_id INTO v_session
    FROM public.random_call_sessions
    WHERE room_name = v_existing_queue.room_name AND status = 'active'
    LIMIT 1;

    IF v_session.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'action', 'matched',
        'room_name', v_existing_queue.room_name,
        'session_id', v_session.id,
        'matched_user_id', CASE WHEN v_session.user1_id = p_user_id THEN v_session.user2_id ELSE v_session.user1_id END
      );
    END IF;
  END IF;

  -- 6) Find a compatible match - FOR UPDATE to lock row during matching
  SELECT * INTO v_match
  FROM public.random_call_queue
  WHERE user_id != p_user_id
    AND status = 'waiting'
    AND room_name IS NULL
    -- Current user looking for this gender
    AND (
      p_looking_for = 'tous' OR 
      (p_looking_for = 'homme' AND gender = 'homme') OR
      (p_looking_for = 'femme' AND gender = 'femme') OR
      (p_looking_for = 'lgbt' AND gender = 'lgbt')
    )
    -- Match is looking for current user's gender
    AND (
      looking_for = 'tous' OR
      (looking_for = 'homme' AND p_user_gender = 'homme') OR
      (looking_for = 'femme' AND p_user_gender = 'femme') OR
      (looking_for = 'lgbt' AND p_user_gender = 'lgbt')
    )
    -- Match is not already in an active session
    AND NOT EXISTS (
      SELECT 1 FROM public.random_call_sessions rcs
      WHERE rcs.status = 'active'
        AND rcs.room_name IS NOT NULL
        AND (rcs.user1_id = random_call_queue.user_id OR rcs.user2_id = random_call_queue.user_id)
    )
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_match IS NULL THEN
    -- No match found, user stays in queue
    RETURN jsonb_build_object(
      'action', 'waiting',
      'queue_id', v_existing_queue.id
    );
  END IF;

  -- 7) Create match
  v_room_name := 'random-call-' || gen_random_uuid()::text;

  INSERT INTO public.random_call_sessions (user1_id, user2_id, room_name, status, started_at, ends_at)
  VALUES (
    LEAST(p_user_id, v_match.user_id),
    GREATEST(p_user_id, v_match.user_id),
    v_room_name,
    'active',
    now(),
    now() + interval '90 seconds'
  )
  RETURNING id INTO v_session;

  -- Update both users in queue to matched status
  UPDATE public.random_call_queue
  SET status = 'matched', room_name = v_room_name, last_heartbeat = now()
  WHERE user_id IN (p_user_id, v_match.user_id);

  RETURN jsonb_build_object(
    'action', 'matched',
    'room_name', v_room_name,
    'session_id', v_session.id,
    'matched_user_id', v_match.user_id
  );
END;
$$;

-- Update heartbeat function to use last_heartbeat (not created_at)
DROP FUNCTION IF EXISTS public.random_call_heartbeat(uuid);

CREATE OR REPLACE FUNCTION public.random_call_heartbeat(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue record;
  v_session record;
BEGIN
  -- Update heartbeat timestamp only (NOT created_at)
  UPDATE public.random_call_queue
  SET last_heartbeat = now()
  WHERE user_id = p_user_id AND status IN ('waiting', 'matched')
  RETURNING * INTO v_queue;

  IF v_queue IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'not_in_queue',
      'success', false
    );
  END IF;

  -- If matched, return session info
  IF v_queue.status = 'matched' AND v_queue.room_name IS NOT NULL THEN
    SELECT id, user1_id, user2_id INTO v_session
    FROM public.random_call_sessions
    WHERE room_name = v_queue.room_name AND status = 'active'
    LIMIT 1;

    IF v_session.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'status', 'matched',
        'success', true,
        'session_id', v_session.id,
        'room_name', v_queue.room_name,
        'matched_user_id', CASE 
          WHEN v_session.user1_id = p_user_id THEN v_session.user2_id 
          ELSE v_session.user1_id 
        END
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', v_queue.status,
    'success', true
  );
END;
$$;