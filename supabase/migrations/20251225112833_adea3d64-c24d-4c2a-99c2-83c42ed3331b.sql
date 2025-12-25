-- Add biometric_enabled column to user_pins table
ALTER TABLE public.user_pins ADD COLUMN biometric_enabled BOOLEAN NOT NULL DEFAULT false;

-- Create a function to automatically delete activity logs older than 20 days
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE created_at < NOW() - INTERVAL '20 days';
END;
$$;

-- Create a scheduled job using pg_cron to run cleanup daily (if extension available)
-- Note: pg_cron might not be enabled, so we'll also cleanup on query
DO $$
BEGIN
  -- Try to schedule a job if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-old-activity-logs',
      '0 0 * * *',
      'SELECT public.cleanup_old_activity_logs()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available, will rely on application-level cleanup
  NULL;
END $$;