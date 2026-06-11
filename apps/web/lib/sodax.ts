'use client';

import { useEffect, useState } from 'react';
import { useSodaxContext } from '@sodax/dapp-kit';
import type { Sodax } from '@sodax/sdk';

/** Generic "run a Sodax read on mount" hook for the no-wallet read surface. */
export function useSodaxRead<T>(
  run: (sodax: Sodax) => Promise<T> | T,
  deps: unknown[] = [],
): { data?: T; error?: string; loading: boolean } {
  const { sodax } = useSodaxContext();
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.resolve()
      .then(() => run(sodax))
      .then((data) => { if (alive) setState({ data, loading: false }); })
      .catch((e) => { if (alive) setState({ error: (e as Error).message, loading: false }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export type ChainMeta = {
  key: string;
  name: string;
  type: string;
  chainId: string | number | undefined;
  explorer: Explorer;
};

export type Explorer = { baseUrl?: string; txUrl?: string; addressUrl?: string; contractUrl?: string };

/** Pull a chain's metadata (name, family, chainId, explorer URLs) from the SDK config. */
export function chainMeta(sodax: Sodax, key: string): ChainMeta {
  let chain: { name?: string; type?: string; chainId?: string | number; explorer?: Explorer } = {};
  try {
    const cfg = sodax.config.getChainConfig(key as never) as { chain?: typeof chain };
    chain = cfg?.chain ?? {};
  } catch {
    /* hub or unknown — fall through to defaults */
  }
  return {
    key,
    name: chain.name ?? key,
    type: chain.type ?? '—',
    chainId: chain.chainId,
    explorer: chain.explorer ?? {},
  };
}

/** Best explorer link for a token/contract address on a given chain. */
export function tokenLink(meta: ChainMeta, address: string): string | undefined {
  if (!address || /^0x0+$/.test(address)) return undefined; // native sentinel
  const e = meta.explorer;
  if (meta.type === 'STELLAR') return e.contractUrl ? e.contractUrl + address : undefined;
  return e.addressUrl ? e.addressUrl + address : e.contractUrl ? e.contractUrl + address : undefined;
}

export function fmtUsd(v: string | number | undefined): string {
  const n = Number(v);
  if (!v || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function fmtPct(v: string | number | undefined): string {
  if (v === undefined || v === null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

export function shortAddr(a: string, n = 10): string {
  return a.length > n + 6 ? `${a.slice(0, n)}…${a.slice(-4)}` : a;
}
