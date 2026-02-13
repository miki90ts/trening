import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';

/**
 * ProtectedRoute - Omotava rute koje zahtevaju autentifikaciju.
 * @param {string} requiredRole - Opciona rola ('admin') za admin-only stranice
 */
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading, initialized } = useAuth();
  const location = useLocation();

  // Dok se auth proverava
  if (!initialized || loading) {
    return <Loading />;
  }

  // Nije ulogovan — redirect na login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Treba admin a korisnik nije admin
  if (requiredRole === 'admin' && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
