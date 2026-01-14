-- Final: lock update/delete strictly to streamer only (no role function dependency)

ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;

-- Keep select public
DROP POLICY IF EXISTS "lives_select_public" ON public.lives;
CREATE POLICY "lives_select_public"
ON public.lives
FOR SELECT
USING (true);

-- Ensure insert is streamer only
DROP POLICY IF EXISTS "lives_insert_streamer" ON public.lives;
CREATE POLICY "lives_insert_streamer"
ON public.lives
FOR INSERT
WITH CHECK (auth.uid() = streamer_id);

-- Only streamer can update/end
DROP POLICY IF EXISTS "lives_update_streamer_only" ON public.lives;
CREATE POLICY "lives_update_streamer_only"
ON public.lives
FOR UPDATE
USING (auth.uid() = streamer_id)
WITH CHECK (auth.uid() = streamer_id);

-- Only streamer can delete
DROP POLICY IF EXISTS "lives_delete_streamer_only" ON public.lives;
CREATE POLICY "lives_delete_streamer_only"
ON public.lives
FOR DELETE
USING (auth.uid() = streamer_id);