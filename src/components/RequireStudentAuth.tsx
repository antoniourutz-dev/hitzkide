import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthenticatedUser } from '../hooks/useAuthenticatedUser';

interface RequireStudentAuthProps {
  children: ReactNode;
}

export default function RequireStudentAuth({ children }: RequireStudentAuthProps) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuthenticatedUser();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/profile" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
