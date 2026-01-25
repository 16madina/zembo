-- Table for Truth or Dare sessions
CREATE TABLE public.truth_or_dare_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, playing, completed
  current_player_id UUID,
  current_challenge_id UUID,
  round_number INT NOT NULL DEFAULT 1,
  max_players INT NOT NULL DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Table for session participants
CREATE TABLE public.truth_or_dare_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.truth_or_dare_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  score INT NOT NULL DEFAULT 0,
  UNIQUE(session_id, user_id)
);

-- Table for challenges (truths and dares)
CREATE TABLE public.truth_or_dare_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('truth', 'dare')),
  category TEXT NOT NULL DEFAULT 'fun', -- fun, romantic, spicy
  content TEXT NOT NULL,
  difficulty INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking played challenges
CREATE TABLE public.truth_or_dare_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.truth_or_dare_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.truth_or_dare_challenges(id),
  choice TEXT NOT NULL CHECK (choice IN ('truth', 'dare')),
  completed BOOLEAN NOT NULL DEFAULT false,
  skipped BOOLEAN NOT NULL DEFAULT false,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.truth_or_dare_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truth_or_dare_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truth_or_dare_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truth_or_dare_plays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Anyone can view active sessions" ON public.truth_or_dare_sessions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sessions" ON public.truth_or_dare_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update their session" ON public.truth_or_dare_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.truth_or_dare_participants 
      WHERE session_id = id AND user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for participants
CREATE POLICY "Anyone can view participants" ON public.truth_or_dare_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join sessions" ON public.truth_or_dare_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON public.truth_or_dare_participants
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for challenges
CREATE POLICY "Anyone can view active challenges" ON public.truth_or_dare_challenges
  FOR SELECT USING (is_active = true);

-- RLS Policies for plays
CREATE POLICY "Anyone can view plays" ON public.truth_or_dare_plays
  FOR SELECT USING (true);

CREATE POLICY "Participants can insert plays" ON public.truth_or_dare_plays
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.truth_or_dare_participants 
      WHERE session_id = truth_or_dare_plays.session_id 
      AND user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Participants can update plays" ON public.truth_or_dare_plays
  FOR UPDATE USING (player_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_or_dare_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_or_dare_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_or_dare_plays;

-- Insert initial challenges (mix of fun and romantic)
INSERT INTO public.truth_or_dare_challenges (type, category, content, difficulty) VALUES
-- Fun Truths
('truth', 'fun', 'Quel est ton moment le plus gênant en public ?', 1),
('truth', 'fun', 'Quelle est la chose la plus folle que tu aies faite par amour ?', 2),
('truth', 'fun', 'Quel est ton talent caché le plus ridicule ?', 1),
('truth', 'fun', 'Quelle est la pire excuse que tu aies inventée pour éviter un rendez-vous ?', 2),
('truth', 'fun', 'Si tu devais manger un seul plat pour le reste de ta vie, lequel ?', 1),
-- Romantic Truths
('truth', 'romantic', 'Qu''est-ce qui te fait craquer chez quelqu''un ?', 1),
('truth', 'romantic', 'Quel est ton type de rendez-vous idéal ?', 1),
('truth', 'romantic', 'As-tu déjà eu le coup de foudre ? Raconte.', 2),
('truth', 'romantic', 'Quelle est la déclaration d''amour la plus originale que tu connaisses ?', 2),
('truth', 'romantic', 'Quel est le geste romantique qui t''a le plus touché(e) ?', 2),
-- Spicy Truths
('truth', 'spicy', 'Quel est ton fantasme le plus inavouable ?', 3),
('truth', 'spicy', 'As-tu déjà eu un crush sur quelqu''un ici présent ?', 3),
('truth', 'spicy', 'Quelle est la chose la plus audacieuse que tu aies faite sur un dating app ?', 2),
-- Fun Dares
('dare', 'fun', 'Fais ta meilleure imitation d''un animal pendant 10 secondes', 1),
('dare', 'fun', 'Envoie le dernier emoji de ton clavier à un(e) ami(e) au hasard', 1),
('dare', 'fun', 'Raconte une blague (même nulle) avec un accent étranger', 1),
('dare', 'fun', 'Fais un compliment original à chaque joueur', 2),
('dare', 'fun', 'Chante le refrain de ta chanson préférée a cappella', 2),
-- Romantic Dares
('dare', 'romantic', 'Décris ton/ta partenaire idéal(e) en 3 mots', 1),
('dare', 'romantic', 'Envoie un message mignon à la dernière personne avec qui tu as matché', 2),
('dare', 'romantic', 'Fais un compliment sincère au joueur de ton choix', 1),
('dare', 'romantic', 'Raconte comment tu imagines ton mariage idéal', 2),
-- Spicy Dares
('dare', 'spicy', 'Fais ton regard le plus séducteur à la caméra', 2),
('dare', 'spicy', 'Décris en détail ton premier baiser', 3),
('dare', 'spicy', 'Avoue publiquement qui ici te semble le/la plus attirant(e)', 3);