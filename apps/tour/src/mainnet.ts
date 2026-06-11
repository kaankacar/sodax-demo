import { Sodax, ChainKeys, type CreateIntentParams } from '@sodax/sdk';
import { StellarWalletProvider, EvmWalletProvider } from '@sodax/wallet-sdk-core';
import { Keypair } from '@stellar/stellar-sdk';
import { env, mainnetArmed } from './env.js';
import { c, scene, ok, info, warn, fail, kv, note, link, raw, payload } from './ui.js';

const pow10 = (n: number): bigint => BigInt(10) ** BigInt(n);
const swapHuman = process.env.SODAX_SWAP_AMOUNT ?? '0.5'; // human units of USDC

type TokenInfo = { address: string; decimals: number };

/**
 * LIVE mainnet execution. SODAX is mainnet-only, so a *real* cross-chain swap can
 * only happen here. Armed ONLY when SODAX_EXECUTE=1 AND a funded key exists.
 * There is no amount cap — whatever SODAX_SWAP_AMOUNT says is what moves.
 *
 * Direction is chosen by which keys/destinations you provide:
 *   - EVM key  + Stellar destination  → EVM → Stellar  (EVM wallet signs)
 *   - Stellar key + EVM destination    → Stellar → EVM  (Stellar wallet signs)
 * The destination can come from the *other* mainnet key, or be set explicitly
 * via SODAX_STELLAR_DST / SODAX_EVM_DST.
 */
export async function sceneMainnetExecute(sodax: Sodax): Promise<void> {
  scene(
    'Live mainnet execution',
    'A real cross-chain swap — armed only with the flag + a funded key + a destination.',
  );

  const armed = mainnetArmed();
  if (!armed.armed) {
    warn(`DISARMED — ${armed.reason}.`);
    note('To fire a real swap: set SODAX_EXECUTE=1 and provide a funded mainnet key');
    note('(STELLAR_MAINNET_SECRET and/or EVM_MAINNET_PRIVATE_KEY) plus a destination.');
    info('Until then, the unsigned intent from the previous scene is exactly what would be signed.');
    raw(c.gray('  ┆'));
    note('The full call is one line — the SDK handles create → relay → settle:');
    raw(c.dim('    await sodax.swaps.swap({ params, walletProvider });  // Result<SwapResponse>'));
    return;
  }

  const usdcArb = sodax.config.findSupportedTokenBySymbol(ChainKeys.ARBITRUM_MAINNET, 'USDC');
  const usdcStellar = sodax.config.findSupportedTokenBySymbol(ChainKeys.STELLAR_MAINNET, 'USDC');
  if (!usdcArb || !usdcStellar) {
    fail('USDC not registered on both chains — aborting live execution.');
    return;
  }

  const haveEvm = Boolean(env.evmMainnetKey);
  const haveStellar = Boolean(env.stellarMainnetSecret);
  // Destinations: derive from the opposite key, else an explicit override.
  const stellarDst =
    (haveStellar ? Keypair.fromSecret(env.stellarMainnetSecret!).publicKey() : undefined) ??
    process.env.SODAX_STELLAR_DST?.trim();
  const evmDst = process.env.SODAX_EVM_DST?.trim(); // EVM addr is derived inline when an EVM key exists

  if (haveEvm && stellarDst) {
    armWarning();
    await runEvmToStellar(sodax, usdcArb, usdcStellar, stellarDst);
  } else if (haveStellar && evmDst) {
    armWarning();
    await runStellarToEvm(sodax, usdcStellar, usdcArb, evmDst);
  } else if (haveEvm) {
    warn('EVM key present but no Stellar destination.');
    note('Add STELLAR_MAINNET_SECRET (to derive one) or set SODAX_STELLAR_DST=G… to execute.');
  } else {
    warn('Stellar key present but no EVM destination.');
    note('Add EVM_MAINNET_PRIVATE_KEY (to derive one) or set SODAX_EVM_DST=0x… to execute.');
  }
}

function armWarning(): void {
  console.log('');
  warn(c.bold(c.red('LIVE MAINNET EXECUTION — this WILL move real funds, with NO cap.')));
  raw(c.gray('  ┆'));
}

async function runEvmToStellar(sodax: Sodax, usdcArb: TokenInfo, usdcStellar: TokenInfo, stellarDst: string): Promise<void> {
  const evm = new EvmWalletProvider({
    privateKey: env.evmMainnetKey! as `0x${string}`,
    chainId: ChainKeys.ARBITRUM_MAINNET,
    rpcUrl: (env.rpc.arbitrum ?? 'https://arb1.arbitrum.io/rpc') as `http${string}`,
  });
  const srcAddress = (await evm.getWalletAddress()) as `0x${string}`;

  const params: CreateIntentParams<typeof ChainKeys.ARBITRUM_MAINNET> = {
    srcChainKey: ChainKeys.ARBITRUM_MAINNET,
    dstChainKey: ChainKeys.STELLAR_MAINNET,
    srcAddress,
    dstAddress: stellarDst,
    inputToken: usdcArb.address,
    outputToken: usdcStellar.address,
    inputAmount: parseHuman(swapHuman, usdcArb.decimals),
    minOutputAmount: (parseHuman(swapHuman, usdcStellar.decimals) * 95n) / 100n,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
    allowPartialFill: false,
    data: '0x',
  };
  kv('route', `${swapHuman} USDC  Arbitrum → Stellar`);
  kv('from (EVM signer)', srcAddress);
  kv('to (Stellar)', stellarDst);

  const allow = await sodax.swaps.isAllowanceValid({ params, raw: false, walletProvider: evm });
  if (!allow.ok) {
    warn('allowance check failed — attempting approve anyway:');
    payload((allow.error as { toJSON?: () => unknown }).toJSON?.() ?? allow.error);
  }
  if (!allow.ok || !allow.value) {
    info('Approving token spend on Arbitrum…');
    const ap = await sodax.swaps.approve({ params, raw: false, walletProvider: evm });
    if (!ap.ok) {
      fail('approve failed:');
      payload((ap.error as { toJSON?: () => unknown }).toJSON?.() ?? ap.error);
      return;
    }
    ok('Approved.');
  }

  info('Submitting swap (create → relay → settle)…');
  const res = await sodax.swaps.swap({ params, walletProvider: evm });
  if (!res.ok) {
    fail(`swap failed: ${(res.error as { code?: string }).code ?? 'UNKNOWN'}`);
    payload((res.error as { toJSON?: () => unknown }).toJSON?.() ?? res.error);
    return;
  }
  const d = res.value.intentDeliveryInfo as Record<string, unknown>;
  ok('Swap executed on mainnet.');
  if (d?.srcTxHash) link('source tx (Arbitrum)', `https://arbiscan.io/tx/${String(d.srcTxHash)}`);
  if (d?.dstTxHash) link('delivery (Stellar)', `https://stellar.expert/explorer/public/tx/${String(d.dstTxHash)}`);
}

async function runStellarToEvm(sodax: Sodax, usdcStellar: TokenInfo, usdcArb: TokenInfo, evmDst: string): Promise<void> {
  const stellar = new StellarWalletProvider({
    type: 'PRIVATE_KEY',
    privateKey: env.stellarMainnetSecret! as `0x${string}`, // runtime wants the S-seed
    network: 'PUBLIC',
    ...(env.rpc.horizon ? { rpcUrl: env.rpc.horizon } : {}),
  });
  const srcAddress = await stellar.getWalletAddress(); // 'G…'

  const params: CreateIntentParams<typeof ChainKeys.STELLAR_MAINNET> = {
    srcChainKey: ChainKeys.STELLAR_MAINNET,
    dstChainKey: ChainKeys.ARBITRUM_MAINNET,
    srcAddress,
    dstAddress: evmDst,
    inputToken: usdcStellar.address,
    outputToken: usdcArb.address,
    inputAmount: parseHuman(swapHuman, usdcStellar.decimals),
    minOutputAmount: (parseHuman(swapHuman, usdcArb.decimals) * 95n) / 100n,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
    allowPartialFill: false,
    data: '0x',
  };
  kv('route', `${swapHuman} USDC  Stellar → Arbitrum`);
  kv('from (Stellar signer)', srcAddress);
  kv('to (Arbitrum)', evmDst);

  // On Stellar, approve() also establishes the trustline if missing.
  const allow = await sodax.swaps.isAllowanceValid({ params, raw: false, walletProvider: stellar });
  if (!allow.ok) {
    warn('allowance check failed — attempting approve anyway:');
    payload((allow.error as { toJSON?: () => unknown }).toJSON?.() ?? allow.error);
  }
  if (!allow.ok || !allow.value) {
    info('Approving on Stellar (also establishes the trustline if needed)…');
    const ap = await sodax.swaps.approve({ params, raw: false, walletProvider: stellar });
    if (!ap.ok) {
      fail('approve failed:');
      payload((ap.error as { toJSON?: () => unknown }).toJSON?.() ?? ap.error);
      return;
    }
    ok('Approved.');
  }

  info('Submitting swap (create → relay → settle)…');
  const res = await sodax.swaps.swap({ params, walletProvider: stellar });
  if (!res.ok) {
    fail(`swap failed: ${(res.error as { code?: string }).code ?? 'UNKNOWN'}`);
    payload((res.error as { toJSON?: () => unknown }).toJSON?.() ?? res.error);
    return;
  }
  const d = res.value.intentDeliveryInfo as Record<string, unknown>;
  ok('Swap executed on mainnet.');
  if (d?.srcTxHash) link('source tx (Stellar)', `https://stellar.expert/explorer/public/tx/${String(d.srcTxHash)}`);
  if (d?.dstTxHash) link('delivery (Arbitrum)', `https://arbiscan.io/tx/${String(d.dstTxHash)}`);
}

function parseHuman(human: string, decimals: number): bigint {
  const [whole, frac = ''] = human.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * pow10(decimals) + BigInt(fracPadded || '0');
}
