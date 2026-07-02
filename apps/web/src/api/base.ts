const BASE_URL = "/api";

interface RequestOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: method !== "GET" ? body : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.error ?? `Request failed: ${res.status} ${res.statusText}`
    );
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
