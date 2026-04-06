export const request = async <T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(url, options);

  const contentType = response.headers.get("Content-Type") ?? "";
  let body: any = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body?.message ?? response.statusText}`); //use message from response if available, otherwise use status text
  }

  return body as T;
};
