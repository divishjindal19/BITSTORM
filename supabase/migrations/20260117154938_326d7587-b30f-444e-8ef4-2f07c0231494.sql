-- Fix infinite recursion in RLS by removing self-referential subqueries on public.user_roles
-- and using the existing SECURITY DEFINER function public.has_role(...)

-- user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- appointments
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view all appointments"
ON public.appointments
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- doctors
DROP POLICY IF EXISTS "Admins can insert doctors" ON public.doctors;
CREATE POLICY "Admins can insert doctors"
ON public.doctors
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can update doctors" ON public.doctors;
CREATE POLICY "Admins can update doctors"
ON public.doctors
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- profiles
DROP POLICY IF EXISTS "Admins can view profiles" ON public.profiles;
CREATE POLICY "Admins can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- announcements
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
ON public.announcements
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
