import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect super admin to organizations page if they try to access other pages
  if (user.isSuperAdmin && location.pathname !== '/organizations') {
    return <Navigate to="/organizations" replace />;
  }

  // Redirect org admin away from super admin pages
  if (user.isOrgAdmin && location.pathname === '/organizations') {
    return <Navigate to="/org-settings" replace />;
  }

  // Redirect regular users away from admin pages
  if (!user.isSuperAdmin && !user.isOrgAdmin) {
    if (location.pathname === '/organizations' || location.pathname === '/org-settings') {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}