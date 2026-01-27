export const request = async <T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  // for non-JSON, caller can set T = string
  return (await response.text()) as T;
};
