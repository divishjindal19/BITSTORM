-- Tighten overly permissive notifications INSERT policy (previously WITH CHECK (true)).
-- System-generated notifications are inserted from backend functions using a service key, which bypasses RLS.

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);
