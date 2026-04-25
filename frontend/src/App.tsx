import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AmbientBackground } from './components/layout/AmbientBackground';
import { Layout } from './components/layout/Layout';

// Import all page components
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import Dashboard from './components/dashboard/Dashboard';
import { ProductsPage } from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import { AlertsPage } from './pages/AlertsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';

// ProtectedRoute component to guard routes that require authentication
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="ambient-page flex items-center justify-center px-4">
        <AmbientBackground />
        <div className="relative z-10 rounded-[28px] border border-white/45 bg-white/30 px-6 py-4 text-primary-900 shadow-[0_20px_60px_rgba(15,52,96,0.18)] backdrop-blur-2xl">
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="ambient-page flex items-center justify-center px-4">
        <AmbientBackground />
        <div className="relative z-10 rounded-[28px] border border-white/45 bg-white/30 px-6 py-4 text-primary-900 shadow-[0_20px_60px_rgba(15,52,96,0.18)] backdrop-blur-2xl">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} /> {/* Default route */}

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Layout>
                <ProductsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ProductDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <Layout>
                <AlertsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <NotificationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
