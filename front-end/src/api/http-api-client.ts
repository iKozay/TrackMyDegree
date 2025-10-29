import { request } from './request';

const SERVER = process.env.REACT_APP_SERVER || 'http://localhost:8000';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  headers?: Record<string, string>;
}

interface BuildOptionsResult extends RequestInit {
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
}

// Helper function to include token + headers
const buildOptions = (method: HttpMethod, data: unknown, extraOptions: RequestOptions = {}): BuildOptionsResult => {
  const token = localStorage.getItem('token');
  const { headers: extraHeaders, ...restOptions } = extraOptions;

  const options: BuildOptionsResult = {
    ...restOptions,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(extraHeaders || {}),
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  return options;
};

// Generic wrappers for each method
export const api = {
  get: <T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> =>
    request(`${SERVER}${endpoint}`, buildOptions('GET', null, options)),

  post: <T = unknown>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> =>
    request(`${SERVER}${endpoint}`, buildOptions('POST', data, options)),

  put: <T = unknown>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> =>
    request(`${SERVER}${endpoint}`, buildOptions('PUT', data, options)),

  patch: <T = unknown>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> =>
    request(`${SERVER}${endpoint}`, buildOptions('PATCH', data, options)),

  delete: <T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> =>
    request(`${SERVER}${endpoint}`, buildOptions('DELETE', null, options)),
};
