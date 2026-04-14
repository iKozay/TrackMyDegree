import type { AuthUser } from "./auth.types";

export type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type UploadResponse = {
  status: string;
  jobId: string;
};
export type AuthResponse = {
  token: string;
  user: AuthUser;
};
