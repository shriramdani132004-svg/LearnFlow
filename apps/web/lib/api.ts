const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.trim()) ||
  '/api/v1';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken(): Promise<string> {
  const existing = readCookie('lf_csrf');
  if (existing) return existing;
  const response = await fetch(`${API_BASE}/auth/csrf`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new ApiError('Unable to initialize a secure session', response.status);
  }
  const data = (await response.json()) as { csrfToken: string };
  return data.csrfToken;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const csrf = await ensureCsrfToken();
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'x-csrf-token': csrf,
          },
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  skipRefresh?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (unsafe) headers.set('x-csrf-token', await ensureCsrfToken());

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    method,
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (
    response.status === 401 &&
    !options.skipRefresh &&
    !path.startsWith('/auth/')
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    if (typeof payload === 'object' && payload !== null) {
      const candidate = (payload as { message?: string | string[] }).message;
      if (Array.isArray(candidate)) message = candidate.join(' ');
      else if (typeof candidate === 'string') message = candidate;
    } else if (typeof payload === 'string' && payload.length < 300) {
      message = payload;
    }
    if (response.status === 429) {
      message = 'Too many requests. Please wait a moment and try again.';
    }
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export const api = {
  base: API_BASE,
  get<T>(path: string, query?: RequestOptions['query']) {
    return request<T>(path, { method: 'GET', query });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'POST', body });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'PUT', body });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'PATCH', body });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
  async download(path: string, filename: string): Promise<void> {
    let response = await fetch(buildUrl(path), {
      credentials: 'include',
      headers: { Accept: 'text/csv' },
    });
    if (response.status === 401 && (await refreshSession())) {
      response = await fetch(buildUrl(path), {
        credentials: 'include',
        headers: { Accept: 'text/csv' },
      });
    }
    if (!response.ok) {
      throw new ApiError('Unable to download the report', response.status);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
