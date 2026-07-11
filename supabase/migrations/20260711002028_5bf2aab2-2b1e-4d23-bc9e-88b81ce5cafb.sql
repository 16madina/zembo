
-- 1. Drop random-call 1:1 matching (Apple 1.2 non-compliant)
DROP FUNCTION IF EXISTS public.random_call_heartbeat(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.random_call_cancel(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.random_call_find_or_create_match(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.find_random_call_match(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_random_call_decision(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.zconnect_find_interest_match(uuid, text, text) CASCADE;
DROP TABLE IF EXISTS public.random_call_queue CASCADE;
DROP TABLE IF EXISTS public.random_call_sessions CASCADE;
DROP TABLE IF EXISTS public.daily_random_calls CASCADE;

-- 2. rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  theme TEXT NOT NULL CHECK (theme IN ('music','business','debate','chill','culture','sport','other')),
  mode TEXT NOT NULL DEFAULT 'audio' CHECK (mode IN ('audio','video')),
  livekit_room TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  participant_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active rooms"
  ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own rooms"
  ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update own room"
  ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can delete own room"
  ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. room_participants
CREATE TABLE public.room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host','moderator','participant')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_participants TO authenticated;
GRANT ALL ON public.room_participants TO service_role;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view participants"
  ON public.room_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join rooms as themselves"
  ON public.room_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User or host can update participant"
  ON public.room_participants FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_id = auth.uid())
  );
CREATE POLICY "User or host can remove participant"
  ON public.room_participants FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_id = auth.uid())
  );

-- 4. content_reports (universal reports table for Apple 1.2)
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('profile','live','room','message','block')),
  content_id UUID,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own reports"
  ON public.content_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view their own reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update reports"
  ON public.content_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_content_reports_updated_at
  BEFORE UPDATE ON public.content_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
