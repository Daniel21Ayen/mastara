// apps/mobile/src/shared/hooks/usePersistedReducer.ts
import { useCallback, useEffect, useReducer, useState } from 'react';

import { attemptStore } from '@/core/db';

type Restore<S> = { type: '__restore__'; state: S };

/**
 * Like useReducer, but every change is written to the phone and restored the next time the screen opens,
 * so work in progress survives the app being closed. `ready` is false until the saved state is loaded.
 * `keep` decides whether a state is worth saving: when it returns false (for example a finished run) the saved copy is deleted.
 */
export function usePersistedReducer<S, A>(
  key: string,
  reducer: (state: S, action: A) => S,
  createInitial: () => S,
  keep: (state: S) => boolean = () => true,
) {
  const wrapped = useCallback(
    (state: S, action: A | Restore<S>): S =>
      (action as Restore<S>).type === '__restore__' ? (action as Restore<S>).state : reducer(state, action as A),
    [reducer],
  );

  const [state, dispatch] = useReducer(wrapped, undefined, createInitial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    attemptStore.load<S>(key).then((saved) => {
      if (cancelled) return;
      if (saved && keep(saved)) dispatch({ type: '__restore__', state: saved });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // `keep` is a stable rule supplied by the caller; the saved state is read once per key.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save after every change once the saved state has been restored.
  useEffect(() => {
    if (!ready) return;
    if (keep(state)) void attemptStore.save(key, state);
    else void attemptStore.remove(key);
  }, [ready, key, state]); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, dispatch: dispatch as (action: A) => void, ready };
}
