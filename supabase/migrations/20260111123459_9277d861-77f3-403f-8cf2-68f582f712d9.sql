-- Fix notifications inserts: remove broken DB trigger that calls non-existent net.http_post
-- This trigger currently prevents inserts into public.notifications, which breaks in-app notifications.

DROP TRIGGER IF EXISTS on_notification_insert ON public.notifications;
DROP FUNCTION IF EXISTS public.trigger_push_notification();
