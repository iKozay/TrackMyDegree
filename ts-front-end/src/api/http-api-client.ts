import { ENV } from "../config";
import { request } from "./request";
import { getCsrfToken } from "./csrf";

const SERVER = ENV.API_SERVER || "http://localhost:8000/api";

type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ExtraOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

const buildOptions = (
  method: HTTPMethod,
  data?: BodyInit | object | null,
  extraOptions: ExtraOptions = {}
): RequestInit => {
  const token = localStorage.getItem("token");
  const isFormData = data instanceof FormData;

  const headers: Record<string, string> = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(extraOptions.headers ?? {}),
  };

  // Attach CSRF token for unsafe methods
  const unsafeMethods: HTTPMethod[] = ["POST", "PUT", "PATCH", "DELETE"];
  const csrfToken = getCsrfToken();
  if (unsafeMethods.includes(method) && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const options: RequestInit = {
    ...extraOptions,
    method,
    headers,
    credentials: "include",
  };

  if (data != null) {
    options.body = isFormData ? (data as BodyInit) : JSON.stringify(data);
  }

  return options;
};

export const api = {
  get: <T = unknown>(
    endpoint: string,
    options: ExtraOptions = {}
  ): Promise<T> =>
    request<T>(`${SERVER}${endpoint}`, buildOptions("GET", undefined, options)),

  post: <T = unknown>(
    endpoint: string,
    data?: BodyInit | object | null,
    options: ExtraOptions = {}
  ): Promise<T> =>
    request<T>(
      `${SERVER}${endpoint}`,
      buildOptions("POST", data ?? null, options)
    ),

  put: <T = unknown>(
    endpoint: string,
    data?: BodyInit | object | null,
    options: ExtraOptions = {}
  ): Promise<T> =>
    request<T>(
      `${SERVER}${endpoint}`,
      buildOptions("PUT", data ?? null, options)
    ),

  patch: <T = unknown>(
    endpoint: string,
    data?: BodyInit | object | null,
    options: ExtraOptions = {}
  ): Promise<T> =>
    request<T>(
      `${SERVER}${endpoint}`,
      buildOptions("PATCH", data ?? null, options)
    ),

  delete: <T = unknown>(
    endpoint: string,
    options: ExtraOptions = {}
  ): Promise<T> =>
    request<T>(
      `${SERVER}${endpoint}`,
      buildOptions("DELETE", undefined, options)
    ),
};
