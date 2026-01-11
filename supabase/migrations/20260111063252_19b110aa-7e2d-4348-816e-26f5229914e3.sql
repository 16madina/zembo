-- Create app_settings table for dynamic configuration
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for edge functions)
CREATE POLICY "Anyone can view settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" 
ON public.app_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default social media settings
INSERT INTO public.app_settings (key, value, description, category) VALUES
  ('social_instagram', 'https://instagram.com/zemboapp', 'Lien Instagram', 'social'),
  ('social_tiktok', 'https://tiktok.com/@zemboapp', 'Lien TikTok', 'social'),
  ('social_twitter', 'https://twitter.com/zemboapp', 'Lien Twitter/X', 'social'),
  ('social_facebook', 'https://facebook.com/zemboapp', 'Lien Facebook', 'social'),
  ('social_youtube', '', 'Lien YouTube', 'social'),
  ('social_linkedin', '', 'Lien LinkedIn', 'social'),
  ('legal_privacy_url', 'https://zemboapp.com/privacy', 'URL Politique de confidentialité', 'legal'),
  ('legal_terms_url', 'https://zemboapp.com/terms', 'URL Conditions d''utilisation', 'legal'),
  ('legal_unsubscribe_url', 'https://zemboapp.com/unsubscribe', 'URL Désabonnement', 'legal'),
  ('app_name', 'Zembo', 'Nom de l''application', 'general'),
  ('app_support_email', 'support@zemboapp.com', 'Email de support', 'general');