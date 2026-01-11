-- Create table for stage requests in live streams
CREATE TABLE public.live_stage_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'on_stage', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.live_stage_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view requests for lives they're watching
CREATE POLICY "Users can view stage requests for active lives"
ON public.live_stage_requests
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can create their own requests
CREATE POLICY "Users can create their own stage requests"
ON public.live_stage_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Streamers can update requests for their lives
CREATE POLICY "Streamers can update stage requests"
ON public.live_stage_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lives
    WHERE lives.id = live_stage_requests.live_id
    AND lives.streamer_id = auth.uid()
  )
  OR auth.uid() = user_id
);

-- Policy: Users can delete their own requests, streamers can delete any request for their live
CREATE POLICY "Users can delete their own requests"
ON public.live_stage_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.lives
    WHERE lives.id = live_stage_requests.live_id
    AND lives.streamer_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_live_stage_requests_live_id ON public.live_stage_requests(live_id);
CREATE INDEX idx_live_stage_requests_status ON public.live_stage_requests(status);

-- Enable realtime for stage requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stage_requests;

-- Create table for WebRTC signaling between streamer and guest
CREATE TABLE public.live_stage_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_stage_signals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view signals directed to them
CREATE POLICY "Users can view their signals"
ON public.live_stage_signals
FOR SELECT
TO authenticated
USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- Policy: Users can create signals
CREATE POLICY "Users can create signals"
ON public.live_stage_signals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can delete their signals
CREATE POLICY "Users can delete signals"
ON public.live_stage_signals
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create index for faster lookups
CREATE INDEX idx_live_stage_signals_live_id ON public.live_stage_signals(live_id);
CREATE INDEX idx_live_stage_signals_receiver_id ON public.live_stage_signals(receiver_id);

-- Enable realtime for signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stage_signals;