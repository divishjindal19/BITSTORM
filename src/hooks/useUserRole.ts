import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UseUserRoleResult {
  role: AppRole | null;
  isDoctor: boolean;
  isPatient: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          // Default to patient if no role found
          setRole('patient');
        } else {
          setRole(data.role);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setRole('patient');
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return {
    role,
    isDoctor: role === 'doctor',
    isPatient: role === 'patient',
    isAdmin: role === 'admin',
    loading,
  };
}
