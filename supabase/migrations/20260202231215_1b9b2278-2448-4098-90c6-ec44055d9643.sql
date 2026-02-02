-- Add gender preference columns to speed_dating_participants table
ALTER TABLE public.speed_dating_participants
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS looking_for TEXT DEFAULT 'tous';

-- Add comment for clarity
COMMENT ON COLUMN public.speed_dating_participants.gender IS 'Participant gender: homme, femme, lgbt';
COMMENT ON COLUMN public.speed_dating_participants.looking_for IS 'Preference for matching: homme, femme, lgbt, tous';