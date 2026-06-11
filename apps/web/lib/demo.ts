import { ChainKeys } from '@sodax/sdk';

/**
 * Demo token addresses, captured live from `sodax.config` (the CLI tour prints
 * these). Hardcoded here only to keep the demo's headline pair stable on stage.
 */
export const TOKENS = {
  stellarUSDC: {
    symbol: 'USDC',
    chainKey: ChainKeys.STELLAR_MAINNET,
    address: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
    decimals: 7,
  },
  stellarBnUSD: {
    symbol: 'bnUSD',
    chainKey: ChainKeys.STELLAR_MAINNET,
    address: 'CD6YBFFWMU2UJHX2NGRJ7RN76IJVTCC7MRA46DUBXNB7E6W7H7JRJ2CX',
    decimals: 7,
  },
  arbitrumUSDC: {
    symbol: 'USDC',
    chainKey: ChainKeys.ARBITRUM_MAINNET,
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
  },
} as const;

export const STELLAR = ChainKeys.STELLAR_MAINNET;
export const ARBITRUM = ChainKeys.ARBITRUM_MAINNET;

export function short(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-5)}` : addr;
}

/** Floor a possibly-decimal numeric string into base units (bigint). */
export function toBaseUnits(human: string, decimals: number): bigint {
  if (!human || Number.isNaN(Number(human))) return 0n;
  const [whole, frac = ''] = human.split('.');
  const f = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(f || '0');
}

/** Render base units as a human decimal string. */
export function fromBaseUnits(v: bigint, decimals: number, maxFrac = 4): string {
  const s = (v < 0n ? -v : v).toString().padStart(decimals + 1, '0');
  const i = s.slice(0, s.length - decimals);
  let f = s.slice(s.length - decimals).slice(0, maxFrac).replace(/0+$/, '');
  return (v < 0n ? '-' : '') + (f ? `${i}.${f}` : i);
}
