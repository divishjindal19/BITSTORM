import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/auth';

export function RoleBasedRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { isDoctor, isPatient, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    if (isDoctor) {
      navigate('/doctor-dashboard', { replace: true });
    } else if (isPatient) {
      navigate('/patient-dashboard', { replace: true });
    } else {
      // Default to patient dashboard for any other role
      navigate('/patient-dashboard', { replace: true });
    }
  }, [user, isDoctor, isPatient, authLoading, roleLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
