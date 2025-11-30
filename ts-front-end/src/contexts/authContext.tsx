// src/auth/AuthContext.ts
import { createContext } from "react";
import type { AuthContextValue } from "../types/auth.types";

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);
