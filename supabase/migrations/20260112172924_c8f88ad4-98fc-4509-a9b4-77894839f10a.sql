-- Créer un enum pour le statut de vérification d'identité
CREATE TYPE public.identity_verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Créer la table pour les demandes de vérification d'identité
CREATE TABLE public.identity_verifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id_photo_url TEXT NOT NULL,
    selfie_url TEXT NOT NULL,
    status identity_verification_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification
CREATE POLICY "Users can view their own verification"
ON public.identity_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own verification
CREATE POLICY "Users can insert their own verification"
ON public.identity_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending verification (to resubmit after rejection)
CREATE POLICY "Users can update their own rejected verification"
ON public.identity_verifications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'rejected');

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
ON public.identity_verifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all verifications
CREATE POLICY "Admins can update all verifications"
ON public.identity_verifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add verification_status to profiles to track identity verification state
ALTER TABLE public.profiles 
ADD COLUMN identity_verification_status TEXT DEFAULT NULL;

-- Create function to update updated_at
CREATE TRIGGER update_identity_verifications_updated_at
BEFORE UPDATE ON public.identity_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for identity documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false);

-- Storage policies for identity-documents bucket
CREATE POLICY "Users can upload their own identity documents"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'identity-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own identity documents"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'identity-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all identity documents"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'identity-documents' 
    AND has_role(auth.uid(), 'admin')
);

-- Function to check if user can interact (verified or no pending manual verification)
CREATE OR REPLACE FUNCTION public.can_user_interact(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NOT EXISTS (
        SELECT 1 
        FROM public.identity_verifications iv
        WHERE iv.user_id = p_user_id 
        AND iv.status = 'pending'
    )
$$;