-- Enable pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to send match notification via edge function
CREATE OR REPLACE FUNCTION public.notify_new_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get Supabase URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not available, use the project URL directly
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://uoevshvljveqqlajwmwb.supabase.co';
  END IF;

  -- Call the edge function to send push notifications
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/notify-match',
    body := json_build_object(
      'user1_id', NEW.user1_id,
      'user2_id', NEW.user2_id,
      'match_id', NEW.id
    )::text,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZXZzaHZsanZlcXFsYWp3bXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDgzNjYsImV4cCI6MjA4MzU4NDM2Nn0.s48St0U4RZuOM6oPSS1FzsAPJQQSUOnKBB_oaOvHT-Y'
    )::jsonb
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the match creation
  RAISE WARNING 'Failed to send match notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on matches table
DROP TRIGGER IF EXISTS trigger_notify_new_match ON public.matches;
CREATE TRIGGER trigger_notify_new_match
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_match();