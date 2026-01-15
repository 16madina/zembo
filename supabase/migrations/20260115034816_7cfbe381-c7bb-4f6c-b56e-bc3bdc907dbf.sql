-- Create live_join_requests table
CREATE TABLE public.live_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  coins_spent INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.live_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own join requests"
ON public.live_join_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests"
ON public.live_join_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Streamers can view requests for their lives"
ON public.live_join_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM lives WHERE lives.id = live_join_requests.live_id AND lives.streamer_id = auth.uid()
));

CREATE POLICY "Streamers can update requests for their lives"
ON public.live_join_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM lives WHERE lives.id = live_join_requests.live_id AND lives.streamer_id = auth.uid()
));

CREATE POLICY "Users can update their own pending requests"
ON public.live_join_requests FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Create coin_transactions table
CREATE TABLE public.coin_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'gift_sent', 'gift_received', 'join_request', 'refund', 'platform_fee', 'welcome_bonus')),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own transactions"
ON public.coin_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
ON public.coin_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for join requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_join_requests;

-- Create index for faster queries
CREATE INDEX idx_live_join_requests_live_id ON public.live_join_requests(live_id);
CREATE INDEX idx_live_join_requests_user_id ON public.live_join_requests(user_id);
CREATE INDEX idx_live_join_requests_status ON public.live_join_requests(status);
CREATE INDEX idx_coin_transactions_user_id ON public.coin_transactions(user_id);