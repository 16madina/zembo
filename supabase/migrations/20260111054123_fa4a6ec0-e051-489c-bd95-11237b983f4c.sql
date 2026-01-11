-- Table pour les utilisateurs bannis
CREATE TABLE public.banned_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    banned_by UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_permanent BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    unbanned_at TIMESTAMP WITH TIME ZONE,
    unbanned_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_banned_users_user_id ON public.banned_users(user_id);
CREATE INDEX idx_banned_users_is_active ON public.banned_users(is_active);

-- Enable RLS
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Policies: seuls les admins peuvent gérer les bans
CREATE POLICY "Admins can view all bans"
ON public.banned_users FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create bans"
ON public.banned_users FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bans"
ON public.banned_users FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Table pour les notifications admin envoyées
CREATE TABLE public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    recipient_id UUID,
    recipient_type TEXT NOT NULL DEFAULT 'individual',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'info',
    is_email BOOLEAN NOT NULL DEFAULT false,
    is_push BOOLEAN NOT NULL DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    push_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_admin_notifications_recipient ON public.admin_notifications(recipient_id);
CREATE INDEX idx_admin_notifications_type ON public.admin_notifications(notification_type);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all notifications"
ON public.admin_notifications FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create notifications"
ON public.admin_notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Table pour les messages prédéfinis
CREATE TABLE public.predefined_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.predefined_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage predefined messages"
ON public.predefined_messages FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger pour updated_at
CREATE TRIGGER update_predefined_messages_updated_at
BEFORE UPDATE ON public.predefined_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour vérifier si un utilisateur est banni
CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_users
    WHERE user_id = p_user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;