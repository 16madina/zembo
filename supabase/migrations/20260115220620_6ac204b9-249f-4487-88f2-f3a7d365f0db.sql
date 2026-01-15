-- Create table for user devices to support multiple FCM tokens per user
CREATE TABLE public.user_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fcm_token TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'unknown', -- 'ios', 'android', 'web'
  device_name TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on user_id + fcm_token to prevent duplicates
CREATE UNIQUE INDEX user_devices_user_token_unique ON public.user_devices (user_id, fcm_token);

-- Create index for faster lookups by user_id
CREATE INDEX user_devices_user_id_idx ON public.user_devices (user_id);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own devices
CREATE POLICY "Users can view their own devices"
ON public.user_devices
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own devices
CREATE POLICY "Users can insert their own devices"
ON public.user_devices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own devices
CREATE POLICY "Users can update their own devices"
ON public.user_devices
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own devices
CREATE POLICY "Users can delete their own devices"
ON public.user_devices
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for device management
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_devices;