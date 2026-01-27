// src/auth/useAuth.ts
import { useContext } from "react";
import { AuthContext } from "../contexts/authContext";
import type { AuthContextValue } from "../types/auth.types";

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
