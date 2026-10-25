// apps/mobile/src/core/network/httpClient.ts
import { ERROR_CODES, type ErrorCode } from '@mastara/domain';

import { env } from '@/core/config/env';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import { ApiError } from './ApiError';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_RETRY_DELAY_MS = 500;
const MAX_RETRY_BACKOFF_MS = 5000;

function isTransientNetworkError(err: unknown, statusCode?: number): boolean {
  if (statusCode && [502, 503, 504].includes(statusCode)) return true;
  if (err instanceof ApiError && err.code === ERROR_CODES.NETWORK_OFFLINE) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      err.name === 'AbortError' ||
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('connection') ||
      msg.includes('econnrefused')
    );
  }
  return false;
}

function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  const exp = Math.min(MAX_RETRY_BACKOFF_MS, baseDelay * Math.pow(2, attempt));
  const jitter = exp * (0.8 + Math.random() * 0.4);
  return Math.round(jitter);
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

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.retries ?? (method === 'GET' ? 2 : 0);
  const baseRetryDelay = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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

      if (response.status === 304) {
        return null as unknown as T;
      }

      if (!response.ok) {
        if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
          const delay = calculateBackoffDelay(attempt, baseRetryDelay);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

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
        } else if ([502, 503, 504].includes(response.status)) {
          mappedCode = ERROR_CODES.NETWORK_OFFLINE;
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
      lastError = error;
      if (error instanceof ApiError) {
        throw error;
      }

      const isTransient = isTransientNetworkError(error);
      if (isTransient && attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt, baseRetryDelay);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      const isTimeout =
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('abort'));
      throw new ApiError(
        ERROR_CODES.NETWORK_OFFLINE,
        isTimeout
          ? 'Network request timed out'
          : error instanceof Error
            ? error.message
            : 'Network request failed',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw (
    lastError ??
    new ApiError(ERROR_CODES.NETWORK_OFFLINE, 'Network request failed after retries')
  );
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
