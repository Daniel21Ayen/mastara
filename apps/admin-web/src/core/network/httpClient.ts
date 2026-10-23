// apps/admin-web/src/core/network/httpClient.ts
import { ADMIN_ERROR_CODES, type AdminErrorCode } from '@mastara/domain';

import { env } from '@/core/config/env';
import { decodeSession, SESSION_COOKIE } from '@/core/session/cookie';
import { ApiError } from './ApiError';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  headers?: Record<string, string>;
}

let explicitToken: string | null = null;

function getActiveToken(): string | null {
  if (explicitToken) return explicitToken;
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`));
    if (match?.[1]) {
      const session = decodeSession(match[1]);
      return session?.token ?? null;
    }
  }
  return null;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  let baseUrl = env.apiUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.hostname && baseUrl.includes('localhost') && window.location.hostname !== 'localhost') {
    baseUrl = baseUrl.replace('localhost', window.location.hostname);
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!baseUrl.endsWith('/api/v1') && !cleanPath.startsWith('/api/v1')) {
    baseUrl = `${baseUrl}/api/v1`;
  }
  const url = `${baseUrl}${cleanPath}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  const token = getActiveToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      requestBody = body;
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      method,
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      let errorJson: { errorCode?: string; message?: string } | null = null;
      try {
        errorJson = await response.json();
      } catch {
        // Not a JSON response
      }

      const backendCode = errorJson?.errorCode;
      let mappedCode: AdminErrorCode = ADMIN_ERROR_CODES.VALIDATION_FAILED;

      if (backendCode && Object.values(ADMIN_ERROR_CODES).includes(backendCode as AdminErrorCode)) {
        mappedCode = backendCode as AdminErrorCode;
      } else if (response.status === 401 || response.status === 403) {
        mappedCode = ADMIN_ERROR_CODES.UNAUTHORIZED;
      } else if (response.status === 404) {
        mappedCode = ADMIN_ERROR_CODES.NOT_FOUND;
      } else if (response.status === 409) {
        mappedCode = ADMIN_ERROR_CODES.INVALID_STATE;
      }

      const message = errorJson?.message ?? `Request failed with status ${response.status}`;
      throw new ApiError(mappedCode, message);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as unknown as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      ADMIN_ERROR_CODES.VALIDATION_FAILED,
      error instanceof Error ? error.message : 'Network request failed',
    );
  }
}

export const httpClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', path, body, options);
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PUT', path, body, options);
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },
  setToken(token: string | null): void {
    explicitToken = token;
  },
  getToken(): string | null {
    return getActiveToken();
  },
};
