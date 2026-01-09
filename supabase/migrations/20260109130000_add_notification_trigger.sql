-- First, enable the http extension if it's not already enabled.
-- You can run this in the Supabase SQL Editor.
-- create extension if not exists http;

-- Function to handle new notifications and trigger an Edge Function.
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
  -- Your project's reference ID, found in your Supabase project's URL
  -- e.g., https://app.supabase.com/project/<PROJECT_REF>
  project_ref TEXT := '<REPLACE_WITH_YOUR_PROJECT_REF>';
  
  -- Your project's service_role key, found in your Supabase project's API settings
  -- Go to Project Settings > API > Project API keys, and copy the service_role secret.
  service_role_key TEXT := '<REPLACE_WITH_YOUR_SERVICE_ROLE_KEY>';
  
  -- The URL of the Edge Function to invoke.
  request_url TEXT := 'https://' || project_ref || '.supabase.co/functions/v1/send-notification';
  
  -- The payload to send to the Edge Function.
  payload JSONB;

BEGIN
  -- Build the JSON payload from the new notification record.
  payload := jsonb_build_object('record', row_to_json(NEW));

  -- Use the pg_net extension to make an asynchronous HTTP POST request.
  -- This invokes the Edge Function without blocking the database transaction.
  PERFORM net.http_post(
    url := request_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Trigger to execute the function after a new row is inserted into the 'notifications' table.
CREATE TRIGGER on_new_notification_trigger
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_notification();
