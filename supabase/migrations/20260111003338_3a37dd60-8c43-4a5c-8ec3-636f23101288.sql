-- Allow users to insert their own coin records
CREATE POLICY "Users can insert their own coins"
  ON public.user_coins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add more virtual gifts for variety
INSERT INTO public.virtual_gifts (name, emoji, price_coins, animation_type) VALUES
  ('Étoile', '⭐', 15, 'sparkle'),
  ('Bisou', '😘', 20, 'float'),
  ('Champagne', '🍾', 75, 'sparkle'),
  ('Couronne', '👑', 150, 'premium'),
  ('Feu', '🔥', 25, 'sparkle'),
  ('Arc-en-ciel', '🌈', 100, 'premium')
ON CONFLICT DO NOTHING;