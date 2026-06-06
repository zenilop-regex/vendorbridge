import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useApp();

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to home page (dashboard) if role not authorized
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
