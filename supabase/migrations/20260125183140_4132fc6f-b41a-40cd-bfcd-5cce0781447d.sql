-- Drop old compatibility tables (we're redesigning the system)
DROP TABLE IF EXISTS compatibility_answers CASCADE;
DROP TABLE IF EXISTS compatibility_games CASCADE;

-- Create new user compatibility profiles table (stores each user's answers)
CREATE TABLE public.user_compatibility_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  answers JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compatibility scores cache table
CREATE TABLE public.compatibility_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Update compatibility_questions table with new structure
DROP TABLE IF EXISTS compatibility_questions CASCADE;
CREATE TABLE public.compatibility_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  category TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_compatibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_compatibility_profiles
CREATE POLICY "Users can view their own compatibility profile" 
ON public.user_compatibility_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own compatibility profile" 
ON public.user_compatibility_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compatibility profile" 
ON public.user_compatibility_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for compatibility_scores (users can see their own scores)
CREATE POLICY "Users can view their compatibility scores" 
ON public.compatibility_scores 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert their compatibility scores" 
ON public.compatibility_scores 
FOR INSERT 
WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update their compatibility scores" 
ON public.compatibility_scores 
FOR UPDATE 
USING (auth.uid() = user1_id);

-- RLS policies for compatibility_questions (everyone can read)
CREATE POLICY "Anyone can view active questions" 
ON public.compatibility_questions 
FOR SELECT 
USING (is_active = true);

-- Insert default questions by category
INSERT INTO public.compatibility_questions (question, category, options, display_order) VALUES
-- Amour & Relation
('Tu cherches :', 'amour', '["💘 Sérieux", "🔥 Fun", "👋 Amis", "🎲 On verra"]', 1),
('En amour, tu es plutôt :', 'amour', '["❤️ Romantique", "😏 Passionné(e)", "🧊 Réservé(e)", "🎭 Mystérieux(se)"]', 2),

-- Mentalité
('Tu préfères :', 'mentalite', '["🏗️ Construire à deux", "⚡ Vivre l''instant", "🦅 Indépendance avant tout", "🎯 Un peu des trois"]', 3),
('Face aux problèmes :', 'mentalite', '["🗣️ J''en parle direct", "🧠 Je réfléchis seul(e)", "⏰ Je laisse passer", "🤝 Je cherche un compromis"]', 4),

-- Lifestyle
('Soirée idéale :', 'lifestyle', '["🎬 Netflix & chill", "🍽️ Sortie resto", "✈️ Voyage improvisé", "🎉 Fête"]', 5),
('Le week-end parfait :', 'lifestyle', '["🏠 Cocooning à la maison", "🌳 Nature & aventure", "🎭 Sorties culturelles", "👥 Entre amis"]', 6),
('Vacances de rêve :', 'lifestyle', '["🏖️ Plage & farniente", "🏔️ Montagne & sport", "🏙️ City trip", "🌍 Road trip"]', 7),

-- Valeurs
('Le plus important pour toi :', 'valeurs', '["🙏 Respect", "💎 Loyauté", "🚀 Ambition", "💬 Communication"]', 8),
('En couple, tu valorises :', 'valeurs', '["🤝 La confiance", "🔥 La passion", "😂 L''humour", "🎯 Les projets communs"]', 9),
('Ta devise :', 'valeurs', '["💪 Qui veut peut", "❤️ L''amour avant tout", "🌟 Carpe diem", "🧘 Patience est mère de vertu"]', 10),

-- Personnalité
('Tu te décris plutôt comme :', 'personnalite', '["😌 Calme", "🔥 Passionné(e)", "😂 Drôle", "💼 Ambitieux(se)"]', 11),
('En société, tu es :', 'personnalite', '["🦋 Extraverti(e)", "🐢 Introverti(e)", "🎭 Ça dépend", "👀 Observateur(trice)"]', 12),
('Ton énergie :', 'personnalite', '["☀️ Solaire", "🌙 Mystérieuse", "⚡ Électrique", "🌊 Apaisante"]', 13),

-- Bonus fun
('Emoji qui te représente :', 'fun', '["😎", "🥰", "🔥", "✨"]', 14),
('Red flag absolu :', 'fun', '["🚫 Mensonge", "📵 Ghosting", "😤 Jalousie", "🙄 Égoïsme"]', 15);

-- Create trigger for updated_at
CREATE TRIGGER update_user_compatibility_profiles_updated_at
BEFORE UPDATE ON public.user_compatibility_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();