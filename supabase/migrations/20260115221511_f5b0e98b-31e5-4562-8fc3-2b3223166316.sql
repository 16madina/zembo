
-- Add unique constraint on user_id + fcm_token for proper upsert
ALTER TABLE public.user_devices
ADD CONSTRAINT user_devices_user_id_fcm_token_key UNIQUE (user_id, fcm_token);
