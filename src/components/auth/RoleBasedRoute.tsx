import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { UserRole } from '../../types/auth';

interface RoleBasedRouteProps {
  allowedRoles: UserRole[];
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.rol)) {
    // Redirigir al dashboard según su rol real si intenta entrar a una prohibida
    const dashboardMap: Record<UserRole, string> = {
      superadmin: '/superadmin',
      admin: '/admin',
      coach: '/coach',
      alumno: '/alumno'
    };
    
    return <Navigate to={user ? dashboardMap[user.rol] : '/login'} replace />;
  }

  return <Outlet />;
};
