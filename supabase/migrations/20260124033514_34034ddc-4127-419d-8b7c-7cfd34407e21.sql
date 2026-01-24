-- Create speed dating sessions table
CREATE TABLE public.speed_dating_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, in_progress, voting, completed
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  round_duration_seconds INTEGER NOT NULL DEFAULT 60,
  total_rounds INTEGER NOT NULL DEFAULT 3
);

-- Create speed dating participants table
CREATE TABLE public.speed_dating_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.speed_dating_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(session_id, user_id)
);

-- Create speed dating rounds table (tracks who met whom)
CREATE TABLE public.speed_dating_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.speed_dating_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id, round_number, user1_id)
);

-- Create speed dating votes table
CREATE TABLE public.speed_dating_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.speed_dating_sessions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  voted_for_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, voter_id, voted_for_id)
);

-- Enable Row Level Security
ALTER TABLE public.speed_dating_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_dating_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_dating_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_dating_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for speed_dating_sessions
CREATE POLICY "Anyone can view active sessions" 
ON public.speed_dating_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create sessions" 
ON public.speed_dating_sessions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can update sessions they participate in" 
ON public.speed_dating_sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.speed_dating_participants 
    WHERE session_id = speed_dating_sessions.id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for speed_dating_participants
CREATE POLICY "Participants can view session participants" 
ON public.speed_dating_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.speed_dating_participants p2 
    WHERE p2.session_id = speed_dating_participants.session_id 
    AND p2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join sessions" 
ON public.speed_dating_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.speed_dating_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for speed_dating_rounds
CREATE POLICY "Participants can view their rounds" 
ON public.speed_dating_rounds 
FOR SELECT 
USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "System can create rounds" 
ON public.speed_dating_rounds 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for speed_dating_votes
CREATE POLICY "Users can view their own votes" 
ON public.speed_dating_votes 
FOR SELECT 
USING (voter_id = auth.uid());

CREATE POLICY "Users can view votes for them in completed sessions" 
ON public.speed_dating_votes 
FOR SELECT 
USING (
  voted_for_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.speed_dating_sessions 
    WHERE id = speed_dating_votes.session_id 
    AND status = 'completed'
  )
);

CREATE POLICY "Users can submit votes" 
ON public.speed_dating_votes 
FOR INSERT 
WITH CHECK (auth.uid() = voter_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.speed_dating_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speed_dating_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speed_dating_rounds;

-- Create indexes for performance
CREATE INDEX idx_speed_dating_participants_session ON public.speed_dating_participants(session_id);
CREATE INDEX idx_speed_dating_participants_user ON public.speed_dating_participants(user_id);
CREATE INDEX idx_speed_dating_rounds_session ON public.speed_dating_rounds(session_id);
CREATE INDEX idx_speed_dating_votes_session ON public.speed_dating_votes(session_id);