// apps/mobile/src/core/network/httpClient.ts
import { ERROR_CODES, type ErrorCode } from '@mastara/domain';

import { env } from '@/core/config/env';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import { ApiError } from './ApiError';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  let baseUrl = env.apiUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!baseUrl.endsWith('/api/v1') && !cleanPath.startsWith('/api/v1')) {
    baseUrl = `${baseUrl}/api/v1`;
  }
  const url = `${baseUrl}${cleanPath}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  const [token, deviceId] = await Promise.all([
    secureStorage.getString(STORAGE_KEYS.token),
    secureStorage.getString(STORAGE_KEYS.deviceId),
  ]);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (deviceId) {
    headers['X-Device-Id'] = deviceId;
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

  const timeoutMs = options.timeoutMs ?? 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
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
      let mappedCode: ErrorCode = ERROR_CODES.VALIDATION_FAILED;

      if (backendCode && Object.values(ERROR_CODES).includes(backendCode as ErrorCode)) {
        mappedCode = backendCode as ErrorCode;
      } else if (response.status === 401) {
        mappedCode = ERROR_CODES.UNAUTHORIZED;
      } else if (response.status === 403) {
        mappedCode = ERROR_CODES.ENTITLEMENT_REQUIRED;
      } else if (response.status === 409) {
        mappedCode = ERROR_CODES.TRANSACTION_REFERENCE_DUPLICATE;
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
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'));
    throw new ApiError(
      ERROR_CODES.NETWORK_OFFLINE,
      isTimeout ? 'Network request timed out' : (error instanceof Error ? error.message : 'Network request failed'),
    );
  } finally {
    clearTimeout(timer);
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
  async setToken(token: string | null): Promise<void> {
    if (token) {
      await secureStorage.setString(STORAGE_KEYS.token, token);
    } else {
      await secureStorage.remove(STORAGE_KEYS.token);
    }
  },
  async getToken(): Promise<string | null> {
    return secureStorage.getString(STORAGE_KEYS.token);
  },
};
