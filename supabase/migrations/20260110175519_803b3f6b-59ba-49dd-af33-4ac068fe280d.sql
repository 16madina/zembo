-- Table pour le signaling WebRTC
CREATE TABLE public.webrtc_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.random_call_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  signal_type TEXT NOT NULL, -- 'offer', 'answer', 'ice-candidate'
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Users can insert signals for their sessions
CREATE POLICY "Users can insert signals" 
ON public.webrtc_signals 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Users can view signals addressed to them
CREATE POLICY "Users can view their signals" 
ON public.webrtc_signals 
FOR SELECT 
USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- Users can delete their own signals
CREATE POLICY "Users can delete signals" 
ON public.webrtc_signals 
FOR DELETE 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Enable realtime for signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;

-- Index for faster queries
CREATE INDEX idx_webrtc_signals_session ON public.webrtc_signals(session_id);
CREATE INDEX idx_webrtc_signals_receiver ON public.webrtc_signals(receiver_id);