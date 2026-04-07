import { setCsrfToken } from "./csrf";

export const request = async <T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(url, options);

  // Capture CSRF token from backend response
  const csrfHeader = response.headers.get("X-CSRF-Token");
  if (csrfHeader) {
    setCsrfToken(csrfHeader);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
};