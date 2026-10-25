// apps/mobile/src/core/downloads/contentGateway.ts
import { ERROR_CODES, resolveContentList, resolveContentRead } from '@mastara/domain';

import { ApiError, isApiError } from '@/core/network';

import { downloadStore } from './downloadStore';

const isOffline = (error: unknown): boolean => isApiError(error, ERROR_CODES.NETWORK_OFFLINE);
const notDownloaded = (): Error => new ApiError(ERROR_CODES.CONTENT_NOT_DOWNLOADED);

/** The same key is used when a unit is downloaded and when it is read, so a download answers exactly that API call. */
export function contentKey(prefix: string, method: string, args: readonly unknown[]): string {
  return `${prefix}.${method}.${JSON.stringify(args)}`;
}

/**
 * One piece of content (a lesson, the questions of a chapter, an exam): the downloaded copy if there is one,
 * otherwise the server (the only way to get it the first time), and offline-and-not-downloaded is a clear error.
 * The rule itself is `resolveContentRead` in the domain package, where it is tested.
 */
export function readContent<T>(key: string, load: () => Promise<T>): Promise<T> {
  return resolveContentRead<T>({
    local: () => downloadStore.getContent<T>(key),
    load,
    isOffline,
    notDownloaded,
  });
}

/**
 * A list of content: the server's list online; offline, lists come from the local catalog.
 * CONTENT_NOT_DOWNLOADED applies only to bodies, never to lists.
 */
export async function readContentList<T>(
  load: () => Promise<T[]>,
  catalogFallback: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    try {
      return await catalogFallback();
    } catch {
      if (isOffline(error)) {
        return [];
      }
      throw error;
    }
  }
}

export interface GatewayOptions<A> {
  /** Methods that return one piece of content. Answered from a download when there is one. */
  details: readonly (keyof A)[];
  /** Methods that return a list, with the function that rebuilds that list from downloads when offline. */
  lists: { [K in keyof A]?: (...args: never[]) => Promise<unknown[]> };
  /** Which arguments identify the answer (default: all). The COC session ignores the student's current course list. */
  keyArgs?: { [K in keyof A]?: (args: unknown[]) => unknown[] };
}

/** Wraps an API object so its content reads follow the online-first / downloaded rules above. Other methods are untouched. */
export function gatewayReads<A extends object>(prefix: string, api: A, options: GatewayOptions<A>): A {
  const wrapped = { ...api } as Record<string, unknown>;

  for (const method of options.details) {
    const original = api[method] as unknown as (...args: unknown[]) => Promise<unknown>;
    const pick = options.keyArgs?.[method];
    wrapped[method as string] = (...args: unknown[]) =>
      readContent(contentKey(prefix, String(method), pick ? pick(args) : args), () => original.apply(api, args));
  }

  for (const method of Object.keys(options.lists) as (keyof A)[]) {
    const original = api[method] as unknown as (...args: unknown[]) => Promise<unknown[]>;
    const downloaded = options.lists[method] as unknown as (...args: unknown[]) => Promise<unknown[]>;
    wrapped[method as string] = (...args: unknown[]) =>
      readContentList(
        () => original.apply(api, args),
        () => downloaded(...args),
      );
  }
  return wrapped as A;
}
