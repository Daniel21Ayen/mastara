// packages/domain/src/content/resolveRead.ts

/** Content is online first. These two functions are the whole rule; the phone supplies the parts (database, network). */
export interface ContentReadParts<T> {
  /** The downloaded copy, if the student downloaded it. A saved "nothing" still counts as a copy. */
  local: () => Promise<{ found: true; value: T } | { found: false }>;
  /** Gets it from the server. */
  load: () => Promise<T>;
  /** True when an error means "no internet". */
  isOffline: (error: unknown) => boolean;
  /** The error to raise when offline and not downloaded. */
  notDownloaded: () => Error;
}

/**
 * One piece of content: the downloaded copy if there is one (no internet, no mobile data); otherwise the server;
 * offline and not downloaded raises `notDownloaded`. Other errors (not allowed, server problem) pass through unchanged.
 */
export async function resolveContentRead<T>(parts: ContentReadParts<T>): Promise<T> {
  const local = await parts.local();
  if (local.found) return local.value;

  try {
    return await parts.load();
  } catch (error) {
    if (parts.isOffline(error)) throw parts.notDownloaded();
    throw error;
  }
}

export interface ContentListParts<T> {
  load: () => Promise<T[]>;
  /** The list rebuilt from downloads, used only when offline. */
  downloaded: () => Promise<T[]>;
  isOffline: (error: unknown) => boolean;
  notDownloaded: () => Error;
}

/** A list of content: from the server; offline, only what was downloaded; offline with nothing downloaded raises `notDownloaded`. */
export async function resolveContentList<T>(parts: ContentListParts<T>): Promise<T[]> {
  try {
    return await parts.load();
  } catch (error) {
    if (!parts.isOffline(error)) throw error;
    const items = await parts.downloaded();
    if (items.length === 0) throw parts.notDownloaded();
    return items;
  }
}
