-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add related_id column for linking notifications to specific entities
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url text;

-- Add is_approved column to doctors for admin approval flow
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Create admin-only insert policy for notifications (system can create notifications via service role)
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Allow admins to manage doctors approval
CREATE POLICY "Admins can update doctors" ON public.doctors FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admins can view all users
CREATE POLICY "Admins can view profiles" ON public.profiles FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Update user_roles policy to allow admin to view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admins can update roles
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admins can view all appointments
CREATE POLICY "Admins can view all appointments" ON public.appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admins can insert doctors
CREATE POLICY "Admins can insert doctors" ON public.doctors FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admins can view announcements
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);