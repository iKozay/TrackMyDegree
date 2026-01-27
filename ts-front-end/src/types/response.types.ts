import type { AuthUser } from "./auth.types";
export type UploadResponse = {
  status: string;
  jobId: string;
};
export type AuthResponse = {
  token: string;
  user: AuthUser;
};
