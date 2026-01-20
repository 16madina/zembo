-- Add discovery filter settings to app_settings
INSERT INTO app_settings (key, value, category, description)
VALUES 
  ('filter_likes', 'true', 'discovery', 'Filtrer les profils déjà likés du flux de découverte'),
  ('filter_passes', 'true', 'discovery', 'Filtrer les profils déjà passés du flux de découverte'),
  ('filter_matches', 'true', 'discovery', 'Filtrer les profils déjà matchés du flux de découverte')
ON CONFLICT (key) DO NOTHING;