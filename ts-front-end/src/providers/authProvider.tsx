import React, { useEffect, useState, useMemo } from "react";
import { api } from "../api/http-api-client";
import type { AuthResponse } from "../types/response.types";
import type { AuthUser, AuthContextValue } from "../types/auth.types";
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
      } catch (err) {
        console.error("Failed to fetch /auth/me", err);
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
    try {
      const res = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
      });
      handleAuthSuccess(res);
    } catch (err) {
      console.error("Login failed", err);
      // normalize + rethrow so UI can show a message
      throw new Error("Invalid email or password");
    }
  };

  const signup: AuthContextValue["signup"] = async (payload) => {
    try {
      const res = await api.post<AuthResponse>("/auth/signup", payload);
      handleAuthSuccess(res);
    } catch (err) {
      console.error("Signup failed", err);
      throw new Error("Could not create account. Please try again.");
    }
  };

  const logout: AuthContextValue["logout"] = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed", err);
      // we still clear user on client so UI is consistent
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      login,
      signup,
      logout,
    }),
    [user, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
