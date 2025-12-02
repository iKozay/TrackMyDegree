// src/auth/ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

type ProtectedRouteProps = {
  redirectTo?: string;
  allowedRoles?: string[]; // optional role-based
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  redirectTo = "/", // they get kicked here if not logged in
  allowedRoles,
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    // Optional: you can replace with a spinner
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Logged in but not allowed
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
