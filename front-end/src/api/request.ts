export const request = async <T = unknown>(url: string, options: RequestInit = {}): Promise<T> => {
  const response: Response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType: string | null = response.headers.get('Content-Type');

  if (contentType?.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
};
