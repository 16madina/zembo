-- Ajouter les paramètres de filtrage de découverte
INSERT INTO public.app_settings (key, value, description, category)
VALUES 
  ('discovery_filter_likes', 'false', 'Filtrer les profils déjà likés du feed', 'discovery'),
  ('discovery_filter_matches', 'false', 'Filtrer les profils déjà matchés du feed', 'discovery'),
  ('discovery_filter_passes', 'false', 'Filtrer les profils swipés à gauche (passes)', 'discovery')
ON CONFLICT (key) DO NOTHING;