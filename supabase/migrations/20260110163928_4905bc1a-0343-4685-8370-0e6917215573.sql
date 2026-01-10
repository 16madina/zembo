-- Table pour stocker les likes (un utilisateur aime un autre)
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id UUID NOT NULL,
  liked_id UUID NOT NULL,
  is_super_like BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(liker_id, liked_id)
);

-- Table pour stocker les matchs mutuels
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Policies pour likes: les utilisateurs peuvent voir leurs propres likes
CREATE POLICY "Users can view their own likes"
ON public.likes
FOR SELECT
USING (auth.uid() = liker_id OR auth.uid() = liked_id);

CREATE POLICY "Users can create likes"
ON public.likes
FOR INSERT
WITH CHECK (auth.uid() = liker_id);

CREATE POLICY "Users can delete their own likes"
ON public.likes
FOR DELETE
USING (auth.uid() = liker_id);

-- Policies pour matches: les utilisateurs peuvent voir leurs propres matchs
CREATE POLICY "Users can view their own matches"
ON public.matches
FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Fonction pour créer un match automatiquement lors d'un like mutuel
CREATE OR REPLACE FUNCTION public.check_and_create_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mutual_like_exists BOOLEAN;
  existing_match_exists BOOLEAN;
BEGIN
  -- Vérifier si l'autre utilisateur a déjà liké celui-ci
  SELECT EXISTS(
    SELECT 1 FROM public.likes 
    WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
  ) INTO mutual_like_exists;

  IF mutual_like_exists THEN
    -- Vérifier si un match n'existe pas déjà
    SELECT EXISTS(
      SELECT 1 FROM public.matches 
      WHERE (user1_id = NEW.liker_id AND user2_id = NEW.liked_id)
         OR (user1_id = NEW.liked_id AND user2_id = NEW.liker_id)
    ) INTO existing_match_exists;

    -- Créer le match si inexistant (toujours avec le plus petit ID en premier pour cohérence)
    IF NOT existing_match_exists THEN
      INSERT INTO public.matches (user1_id, user2_id)
      VALUES (
        LEAST(NEW.liker_id, NEW.liked_id),
        GREATEST(NEW.liker_id, NEW.liked_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger pour vérifier les matchs après chaque like
CREATE TRIGGER on_like_check_match
AFTER INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.check_and_create_match();

-- Fonction utilitaire pour vérifier si deux utilisateurs sont matchés
CREATE OR REPLACE FUNCTION public.are_users_matched(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE (user1_id = LEAST(user_a, user_b) AND user2_id = GREATEST(user_a, user_b))
  );
$$;