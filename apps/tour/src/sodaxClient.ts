import { Sodax, ChainKeys, type DeepPartial, type SodaxConfig } from '@sodax/sdk';
import { env } from './env.js';

/**
 * Build a Sodax instance with any RPC overrides from the environment, then
 * initialize it. `initialize()` loads fresh config from the SODAX backend and
 * silently falls back to packaged defaults if the network is unreachable.
 *
 * NOTE: SODAX's protocol is mainnet-only — there are no testnet ChainKeys —
 * so this instance always talks to the production hub/solver. We only ever
 * READ from it or BUILD (unsigned) intents unless live execution is armed.
 */
export async function makeSodax(): Promise<{ sodax: Sodax; initialized: boolean }> {
  const chains: NonNullable<DeepPartial<SodaxConfig>['chains']> = {};
  if (env.rpc.sonic) chains[ChainKeys.SONIC_MAINNET] = { rpcUrl: env.rpc.sonic };
  if (env.rpc.arbitrum) chains[ChainKeys.ARBITRUM_MAINNET] = { rpcUrl: env.rpc.arbitrum };
  if (env.rpc.base) chains[ChainKeys.BASE_MAINNET] = { rpcUrl: env.rpc.base };

  const config: DeepPartial<SodaxConfig> | undefined =
    Object.keys(chains).length > 0 ? { chains } : undefined;

  const sodax = new Sodax(config);
  const init = await sodax.config.initialize(); // Promise<Result<void>>
  return { sodax, initialized: init.ok };
}
