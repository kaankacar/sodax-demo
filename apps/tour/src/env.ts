import 'dotenv/config';

/**
 * Centralized, typed view of the environment. The tour is designed to run with
 * ZERO configuration — every live-money feature is opt-in and off by default.
 */
export const env = {
  // Stellar testnet signing: if unset, the tour generates + friendbot-funds a key.
  stellarTestnetSecret: process.env.STELLAR_TESTNET_SECRET?.trim() || undefined,

  // Live mainnet execution is armed only when BOTH the flag is on AND keys exist.
  executeFlag: process.env.SODAX_EXECUTE === '1' || process.env.SODAX_EXECUTE === 'true',
  stellarMainnetSecret: process.env.STELLAR_MAINNET_SECRET?.trim() || undefined,
  evmMainnetKey: process.env.EVM_MAINNET_PRIVATE_KEY?.trim() || undefined,

  rpc: {
    sonic: process.env.SONIC_RPC_URL?.trim() || undefined,
    arbitrum: process.env.ARBITRUM_RPC_URL?.trim() || undefined,
    base: process.env.BASE_RPC_URL?.trim() || undefined,
    horizon: process.env.STELLAR_HORIZON_URL?.trim() || undefined,
  },
} as const;

/** True only when it is safe AND intended to move real funds on mainnet. */
export function mainnetArmed(): { armed: boolean; reason: string } {
  if (!env.executeFlag) return { armed: false, reason: 'SODAX_EXECUTE is not set to 1' };
  if (!env.stellarMainnetSecret && !env.evmMainnetKey) {
    return { armed: false, reason: 'no funded mainnet keys provided' };
  }
  return { armed: true, reason: 'flag set + keys present' };
}
