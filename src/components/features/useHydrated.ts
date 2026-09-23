'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** Store is persisted to localStorage — render store-driven UI only on the client to avoid SSR mismatch. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
