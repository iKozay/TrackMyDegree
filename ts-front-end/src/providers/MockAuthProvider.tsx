import React, { useState, useEffect } from "react";
import { AuthContext } from "../contexts/authContext"; // same context you already use
import type { AuthContextValue, AuthUser } from "../types/auth.types";

// Optional: start with a fake logged-out state
const MOCK_DELAY = 400; // ms – just to simulate a real request

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulate initial "who am I?" check
  useEffect(() => {
    const timer = setTimeout(() => {
      // start unauthenticated for testing
      setUser(null);
      setLoading(false);
    }, MOCK_DELAY);

    return () => clearTimeout(timer);
  }, []);

  const fakeLogin = async (email: string, _password: string) => {
    setLoading(true);
    await new Promise((res) => setTimeout(res, MOCK_DELAY));

    const fakeUser: AuthUser = {
      id: "mock-student-1",
      email,
      name: "Yassine Ibhir",
      role: "student", // or "admin" if you want to test admin flows
    };

    setUser(fakeUser);
    setLoading(false);
  };

  const fakeSignup = async (data: {
    email: string;
    password: string;
    name: string;
  }) => {
    setLoading(true);
    await new Promise((res) => setTimeout(res, MOCK_DELAY));

    const fakeUser: AuthUser = {
      id: "mock-student-2",
      email: data.email,
      name: data.name,
      role: "student",
    };

    setUser(fakeUser);
    setLoading(false);
  };

  const fakeLogout = async () => {
    setLoading(true);
    await new Promise((res) => setTimeout(res, 200));
    setUser(null);
    setLoading(false);
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    login: fakeLogin,
    signup: fakeSignup,
    logout: fakeLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
