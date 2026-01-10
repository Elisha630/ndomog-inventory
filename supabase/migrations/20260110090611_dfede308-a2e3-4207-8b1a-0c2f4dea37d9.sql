-- Create a function to call the edge function via pg_net
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Only trigger for new notifications with a user_id
  IF NEW.user_id IS NOT NULL THEN
    SELECT net.http_post(
      url := 'https://mienlzvjeyneepkxxnhs.supabase.co/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZW5senZqZXluZWVwa3h4bmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MDcwMjAsImV4cCI6MjA4MjA4MzAyMH0.eJVO_hUJhm_Ck_2uuo2chQCCJ3jhRVtHUCo8FKTiBXU'
      ),
      body := jsonb_build_object(
        'record', jsonb_build_object(
          'id', NEW.id,
          'user_id', NEW.user_id,
          'action', NEW.action,
          'item_name', NEW.item_name,
          'action_user_email', NEW.action_user_email,
          'details', NEW.details,
          'type', NEW.type
        )
      )
    ) INTO request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on the notifications table
CREATE TRIGGER on_notification_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();