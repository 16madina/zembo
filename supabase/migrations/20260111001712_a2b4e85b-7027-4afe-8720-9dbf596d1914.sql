-- Enum pour le statut des lives
CREATE TYPE public.live_status AS ENUM ('scheduled', 'live', 'ended');

-- Enum pour les types d'abonnement
CREATE TYPE public.subscription_tier AS ENUM ('free', 'premium', 'vip');

-- Table des abonnements utilisateur
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Table des lives
CREATE TABLE public.lives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  status live_status NOT NULL DEFAULT 'scheduled',
  viewer_count INTEGER NOT NULL DEFAULT 0,
  max_viewers INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  livekit_room_name TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des cadeaux virtuels disponibles
CREATE TABLE public.virtual_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  price_coins INTEGER NOT NULL,
  animation_type TEXT DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des coins des utilisateurs
CREATE TABLE public.user_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Table des transactions de cadeaux
CREATE TABLE public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  live_id UUID REFERENCES public.lives(id) ON DELETE SET NULL,
  gift_id UUID NOT NULL REFERENCES public.virtual_gifts(id),
  coin_amount INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des messages du chat live
CREATE TABLE public.live_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;

-- Policies pour user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies pour lives
CREATE POLICY "Anyone can view active lives"
  ON public.lives FOR SELECT
  USING (status = 'live' OR streamer_id = auth.uid());

CREATE POLICY "Premium users can create lives"
  ON public.lives FOR INSERT
  WITH CHECK (
    auth.uid() = streamer_id AND
    EXISTS (
      SELECT 1 FROM public.user_subscriptions
      WHERE user_id = auth.uid() AND tier IN ('premium', 'vip') AND is_active = true
    )
  );

CREATE POLICY "Streamers can update their own lives"
  ON public.lives FOR UPDATE
  USING (auth.uid() = streamer_id);

CREATE POLICY "Streamers can delete their own lives"
  ON public.lives FOR DELETE
  USING (auth.uid() = streamer_id);

-- Policies pour virtual_gifts
CREATE POLICY "Anyone can view active gifts"
  ON public.virtual_gifts FOR SELECT
  USING (is_active = true);

-- Policies pour user_coins
CREATE POLICY "Users can view their own coins"
  ON public.user_coins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own coins"
  ON public.user_coins FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies pour gift_transactions
CREATE POLICY "Users can view their gift transactions"
  ON public.gift_transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send gifts"
  ON public.gift_transactions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Policies pour live_messages
CREATE POLICY "Anyone can view live messages"
  ON public.live_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON public.live_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Activer realtime pour les lives et messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.lives;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;

-- Trigger pour updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lives_updated_at
  BEFORE UPDATE ON public.lives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_coins_updated_at
  BEFORE UPDATE ON public.user_coins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer des cadeaux virtuels par défaut
INSERT INTO public.virtual_gifts (name, emoji, price_coins, animation_type) VALUES
  ('Rose', '🌹', 10, 'float'),
  ('Coeur', '❤️', 25, 'burst'),
  ('Étoile', '⭐', 50, 'sparkle'),
  ('Couronne', '👑', 100, 'crown'),
  ('Diamant', '💎', 500, 'diamond'),
  ('Fusée', '🚀', 1000, 'rocket');

-- Fonction pour vérifier si l'utilisateur peut diffuser
CREATE OR REPLACE FUNCTION public.can_go_live(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = p_user_id
      AND tier IN ('premium', 'vip')
      AND is_active = true
  );
$$;