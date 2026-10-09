// apps/mobile/src/shared/hooks/useAsync.ts
import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Runs `run` on mount and whenever `deps` change or `reload` is called.
 * Pass `null` to skip loading (for example while a parent selection is still empty).
 */
export function useAsync<T>(
  run: (() => Promise<T>) | null,
  deps: readonly unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(run !== null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!run) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    run()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause : new Error(String(cause)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `run` is excluded on purpose: callers pass inline functions and list real inputs in `deps`.
  }, [version, run === null, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { data, error, loading, reload };
}
