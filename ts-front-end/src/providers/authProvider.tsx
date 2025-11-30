// src/auth/AuthProvider.tsx
import React, { useEffect, useState } from "react";
import { api } from "../api/http-api-client";
import type {
  AuthUser,
  AuthResponse,
  AuthContextValue,
} from "../types/auth.types";
import { AuthContext } from "../contexts/authContext";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get<{ user: AuthUser }>("/auth/me");
        setUser(res.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const handleAuthSuccess = (data: AuthResponse) => {
    // backend already set cookie; just store user in state
    setUser(data.user);
  };

  const login: AuthContextValue["login"] = async (email, password) => {
    const res = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    handleAuthSuccess(res);
  };

  const signup: AuthContextValue["signup"] = async (payload) => {
    const res = await api.post<AuthResponse>("/auth/signup", payload);
    handleAuthSuccess(res);
  };

  const logout: AuthContextValue["logout"] = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
