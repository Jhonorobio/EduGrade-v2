import React from 'react';
import { Navigate } from 'react-router-dom';
import { User, UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  currentUser: User | null;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  currentUser,
  allowedRoles,
}) => {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
