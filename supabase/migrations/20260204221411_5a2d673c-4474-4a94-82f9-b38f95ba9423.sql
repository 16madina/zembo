-- Create blocked_users table for blocking functionality
CREATE TABLE public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL,
    blocked_id UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can see their own blocks
CREATE POLICY "Users can view their own blocks"
ON public.blocked_users
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block other users"
ON public.blocked_users
FOR INSERT
WITH CHECK (auth.uid() = blocker_id AND auth.uid() != blocked_id);

-- Users can unblock others
CREATE POLICY "Users can unblock users"
ON public.blocked_users
FOR DELETE
USING (auth.uid() = blocker_id);

-- Create ai_data_consents table for GDPR/privacy compliance
CREATE TABLE public.ai_data_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    consented_at TIMESTAMP WITH TIME ZONE,
    consent_version TEXT NOT NULL DEFAULT '1.0',
    consent_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_data_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent
CREATE POLICY "Users can view their own consent"
ON public.ai_data_consents
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their consent
CREATE POLICY "Users can insert their consent"
ON public.ai_data_consents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their consent
CREATE POLICY "Users can update their consent"
ON public.ai_data_consents
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for blocked_users to instantly filter
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;

-- Create function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(p_user_id UUID, p_by_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = p_user_id AND blocked_id = p_by_user_id)
       OR (blocker_id = p_by_user_id AND blocked_id = p_user_id)
  )
$$;

-- Create trigger for updated_at on ai_data_consents
CREATE OR REPLACE TRIGGER update_ai_data_consents_updated_at
BEFORE UPDATE ON public.ai_data_consents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();