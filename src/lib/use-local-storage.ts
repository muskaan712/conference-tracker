"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** Flips from false to true once mounted on the client, without setState-in-effect. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * SSR-safe localStorage-backed state, implemented with useSyncExternalStore so
 * the client/server reconciliation happens through React's sanctioned path
 * instead of a setState-in-effect (which triggers an extra render + lint error).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const hydrated = useHydrated();

  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const getServerSnapshot = useCallback(() => null, []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let value = initialValue;
  if (hydrated && raw != null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = initialValue;
    }
  }

  const setAndPersist = useCallback(
    (next: T | ((prev: T) => T)) => {
      let current = initialValue;
      try {
        const rawNow = window.localStorage.getItem(key);
        if (rawNow != null) current = JSON.parse(rawNow) as T;
      } catch {
        current = initialValue;
      }
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Storage may be unavailable (private browsing, quota); ignore.
      }
      emitChange();
    },
    [key, initialValue],
  );

  return [value, setAndPersist, hydrated];
}
