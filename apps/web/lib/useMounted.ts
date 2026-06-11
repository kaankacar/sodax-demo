'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true only after the first client render. Wallet connection state
 * (Zustand, rehydrated from localStorage) is empty on the server and the first
 * client paint — gate connected-state UI on this to avoid hydration mismatch.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
