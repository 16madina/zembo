-- Create table for compatibility game sessions
CREATE TABLE public.compatibility_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  user1_score INTEGER DEFAULT 0,
  user2_score INTEGER DEFAULT 0,
  compatibility_score INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Create table for predefined compatibility questions
CREATE TABLE public.compatibility_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user answers
CREATE TABLE public.compatibility_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.compatibility_games(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.compatibility_questions(id),
  user_id UUID NOT NULL,
  answer TEXT NOT NULL, -- 'A' or 'B'
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_id, question_id, user_id)
);

-- Enable RLS
ALTER TABLE public.compatibility_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compatibility_games
CREATE POLICY "Users can view their own games"
ON public.compatibility_games FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create games with matches"
ON public.compatibility_games FOR INSERT
WITH CHECK (auth.uid() = user1_id AND are_users_matched(user1_id, user2_id));

CREATE POLICY "Users can update their own games"
ON public.compatibility_games FOR UPDATE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for compatibility_questions
CREATE POLICY "Anyone can view active questions"
ON public.compatibility_questions FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage questions"
ON public.compatibility_questions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for compatibility_answers
CREATE POLICY "Users can view answers in their games"
ON public.compatibility_answers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM compatibility_games g 
  WHERE g.id = game_id AND (g.user1_id = auth.uid() OR g.user2_id = auth.uid())
));

CREATE POLICY "Users can insert their own answers"
ON public.compatibility_answers FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM compatibility_games g 
  WHERE g.id = game_id AND (g.user1_id = auth.uid() OR g.user2_id = auth.uid())
));

-- Enable realtime for game updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.compatibility_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compatibility_answers;

-- Insert default compatibility questions
INSERT INTO public.compatibility_questions (question, option_a, option_b, category) VALUES
('Pour un premier rendez-vous, tu préfères...', 'Un dîner romantique 🍷', 'Une activité fun 🎢', 'dating'),
('En vacances, tu es plutôt...', 'Plage et détente ☀️', 'Aventure et découverte 🏔️', 'lifestyle'),
('Le week-end idéal c''est...', 'Sortir avec des amis 🎉', 'Cocooning à la maison 🛋️', 'lifestyle'),
('Dans une relation, le plus important c''est...', 'La communication 💬', 'Les moments ensemble ❤️', 'relationship'),
('Tu préfères quelqu''un qui...', 'Te fait rire 😂', 'Te surprend 🎁', 'personality'),
('Pour regarder un film ensemble...', 'Comédie romantique 💕', 'Action/Thriller 🔥', 'entertainment'),
('Petit-déjeuner au lit ou...', 'Brunch dehors 🥐', 'Cuisiner ensemble 👩‍🍳', 'lifestyle'),
('En soirée, tu es plutôt...', 'Danse jusqu''au bout 💃', 'Conversations profondes 🌙', 'personality'),
('Le cadeau parfait c''est...', 'Une surprise 🎁', 'Quelque chose de demandé 📝', 'relationship'),
('Ton langage d''amour c''est...', 'Les mots doux 💌', 'Les gestes tendres 🤗', 'relationship');