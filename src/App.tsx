import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleBasedRoute } from './components/auth/RoleBasedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AlumnoDashboard } from './pages/dashboards/AlumnoDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { CoachDashboard } from './pages/dashboards/CoachDashboard';
import { SuperAdminDashboard } from './pages/dashboards/SuperAdminDashboard';
import { useAuth } from './hooks/useAuth';

// Component to handle initial redirection
const Home = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  switch (user.rol) {
    case 'superadmin': return <Navigate to="/dashboard/superadmin" replace />;
    case 'admin': return <Navigate to="/dashboard/admin" replace />;
    case 'coach': return <Navigate to="/dashboard/coach" replace />;
    case 'alumno': return <Navigate to="/dashboard/alumno" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Home />} />
              
              <Route 
                path="/dashboard/alumno" 
                element={
                  <RoleBasedRoute allowedRoles={['alumno']}>
                    <AlumnoDashboard />
                  </RoleBasedRoute>
                } 
              />

              <Route 
                path="/dashboard/admin" 
                element={
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </RoleBasedRoute>
                } 
              />

              <Route 
                path="/dashboard/coach" 
                element={
                  <RoleBasedRoute allowedRoles={['coach']}>
                    <CoachDashboard />
                  </RoleBasedRoute>
                } 
              />

              <Route 
                path="/dashboard/superadmin" 
                element={
                  <RoleBasedRoute allowedRoles={['superadmin']}>
                    <SuperAdminDashboard />
                  </RoleBasedRoute>
                } 
              />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
