import {
  Sodax,
  ChainKeys,
  type XToken,
  type SpokeChainKey,
  type StellarSpokeService,
  type EvmRawTransaction,
} from '@sodax/sdk';
import { Keypair } from '@stellar/stellar-sdk';
import { c, scene, ok, info, warn, fail, kv, note, table, payload, raw } from './ui.js';

const pow10 = (n: number): bigint => BigInt(10) ** BigInt(n);

/** Friendly chain label from a ChainKey string value. */
function chainLabel(key: string): string {
  const found = Object.entries(ChainKeys).find(([, v]) => v === key);
  return found ? found[0].replace('_MAINNET', '') : key;
}

// ── Scene 1: what SODAX is + initialize ──────────────────────────────────────
export function sceneIntro(initialized: boolean): void {
  scene(
    'Initialize the SDK',
    'One Sodax instance fans out to swaps · money-market · bridge · staking · dex.',
  );
  raw(c.dim('    const sodax = new Sodax();'));
  raw(c.dim('    await sodax.config.initialize();   // Result<void>'));
  if (initialized) ok('Loaded live config from the SODAX backend (api.sodax.com).');
  else warn('Backend unreachable — running on the SDK\'s packaged default config.');
  note('Services ready: sodax.swaps, .moneyMarket, .bridge, .staking, .dex, .config, .spoke');
}

// ── Scene 2: enumerate the connected network graph ───────────────────────────
export function sceneChains(sodax: Sodax): void {
  scene(
    'The connected network graph',
    'SODAX settles across one hub (Sonic) + many spokes. All reads here are synchronous.',
  );
  const spokes = sodax.config.getSupportedSpokeChains() as readonly SpokeChainKey[];
  kv('hub chain', `${chainLabel(ChainKeys.SONIC_MAINNET)}  (${ChainKeys.SONIC_MAINNET})`);
  kv('spoke chains', String(spokes.length));
  const labels = spokes.map((s) => chainLabel(s));
  // print in rows of 6 for readability
  for (let i = 0; i < labels.length; i += 6) {
    note(labels.slice(i, i + 6).map((l) => l.toLowerCase()).join('  ·  '));
  }
  const stellarValid = sodax.config.isValidSpokeChainKey(ChainKeys.STELLAR_MAINNET);
  if (stellarValid) ok(`Stellar is a first-class spoke — ChainKeys.STELLAR_MAINNET = '${ChainKeys.STELLAR_MAINNET}'`);
  else fail('Stellar not found among spokes (unexpected).');
}

// ── Scene 3: tokens SODAX supports on Stellar ────────────────────────────────
export function sceneStellarTokens(sodax: Sodax): void {
  scene(
    'Assets SODAX speaks on Stellar',
    'Swap-routable + money-market tokens registered for the Stellar spoke.',
  );
  const swapToks = sodax.config.getSupportedSwapTokensByChainId(ChainKeys.STELLAR_MAINNET) as readonly XToken[];
  const mmToks = sodax.config.getSupportedMoneyMarketTokensByChainId(ChainKeys.STELLAR_MAINNET) as readonly XToken[];

  if (swapToks.length === 0) {
    warn('No Stellar swap tokens in the active config.');
  } else {
    info(`${swapToks.length} swap-routable Stellar asset(s):`);
    table(
      ['SYMBOL', 'DEC', 'STELLAR ADDRESS / CONTRACT ID'],
      swapToks.slice(0, 8).map((t) => [t.symbol, String(t.decimals), truncMid(t.address, 44)]),
      [8, 4, 44],
    );
  }
  info(`${mmToks.length} Stellar asset(s) usable in the money market.`);
  note('Each XToken also carries { hubAsset, vault } — its representation on the Sonic hub.');
}

// ── Scene 4: money market ────────────────────────────────────────────────────
export function sceneMoneyMarket(sodax: Sodax): void {
  scene(
    'Cross-chain money market',
    'Supply on one chain, borrow the delivery on another. Positions live on the hub.',
  );
  const reserves = sodax.moneyMarket.getSupportedReserves();
  const allByChain = sodax.moneyMarket.getSupportedTokens();
  const chainsWithMM = Object.keys(allByChain as Record<string, unknown>).length;
  kv('reserve assets (hub)', String(reserves.length));
  kv('chains with markets', String(chainsWithMM));
  const stellarMM = sodax.moneyMarket.getSupportedTokensByChainId(ChainKeys.STELLAR_MAINNET) as readonly XToken[];
  if (stellarMM.length > 0) {
    ok(`Stellar money-market assets: ${stellarMM.map((t) => t.symbol).join(', ')}`);
    note('e.g. borrow USDC on Stellar against collateral supplied from Arbitrum — one call:');
    raw(c.dim("    sodax.moneyMarket.borrow({ params: { srcChainKey: ARBITRUM, action:'borrow',"));
    raw(c.dim("      dstChainKey: STELLAR, dstAddress:'G…', token, amount }, walletProvider })"));
  } else {
    info('No Stellar-specific money-market assets in the active config.');
  }
}

// ── Scene 5: bridge limits (async read, Result-wrapped) ──────────────────────
export async function sceneBridge(sodax: Sodax): Promise<void> {
  scene(
    'Bridgeable liquidity, Arbitrum → Stellar',
    'A real async read against the live backend, returned as Result<BridgeLimit>.',
  );
  const usdcArb = sodax.config.findSupportedTokenBySymbol(ChainKeys.ARBITRUM_MAINNET, 'USDC');
  const usdcStellar = sodax.config.findSupportedTokenBySymbol(ChainKeys.STELLAR_MAINNET, 'USDC');
  if (!usdcArb || !usdcStellar) {
    warn('USDC not registered on both chains in the active config — skipping.');
    return;
  }
  kv('from', `USDC on ${chainLabel(usdcArb.chainKey)} (${usdcArb.decimals}dp)`);
  kv('to', `USDC on ${chainLabel(usdcStellar.chainKey)} (${usdcStellar.decimals}dp)`);

  const isBridgeable = sodax.bridge.isBridgeable({ from: usdcArb, to: usdcStellar });
  kv('isBridgeable (sync)', isBridgeable ? c.green('true') : c.yellow('false'));

  const limit = await sodax.bridge.getBridgeableAmount(usdcArb, usdcStellar);
  if (!limit.ok) {
    fail('getBridgeableAmount failed — and notice the SDK never threw:');
    note(`error.code = ${(limit.error as { code?: string }).code ?? 'UNKNOWN'}`);
    return;
  }
  const { amount, decimals, type } = limit.value;
  ok(`max bridgeable ≈ ${formatUnits(amount, decimals)} USDC   (${type})`);
}

// ── Scene 6: build an UNSIGNED cross-chain swap intent ───────────────────────
export async function sceneBuildIntent(sodax: Sodax): Promise<void> {
  scene(
    'Build a cross-chain swap intent (no signing)',
    'raw:true returns the unsigned payload — inspect exactly what a user would sign.',
  );
  const usdcArb = sodax.config.findSupportedTokenBySymbol(ChainKeys.ARBITRUM_MAINNET, 'USDC');
  const usdcStellar = sodax.config.findSupportedTokenBySymbol(ChainKeys.STELLAR_MAINNET, 'USDC');
  if (!usdcArb || !usdcStellar) {
    warn('USDC missing on one side in the active config — skipping intent build.');
    return;
  }

  // A valid-format (but throwaway) destination Stellar account, just for the payload.
  const demoStellarDst = Keypair.random().publicKey(); // 'G…'
  const demoEvmSrc = '0x1111111111111111111111111111111111111111' as `0x${string}`;

  const inputAmount = pow10(usdcArb.decimals); // 1 USDC
  const minOutputAmount = (pow10(usdcStellar.decimals) * 99n) / 100n; // ~0.99 USDC, decimals-scaled

  info('Arbitrum USDC → Stellar USDC, 1.00 in, ≥0.99 out:');
  const result = await sodax.swaps.createIntent({
    params: {
      srcChainKey: ChainKeys.ARBITRUM_MAINNET,
      dstChainKey: ChainKeys.STELLAR_MAINNET,
      srcAddress: demoEvmSrc,
      dstAddress: demoStellarDst,
      inputToken: usdcArb.address, // STRING token address (not the XToken object)
      outputToken: usdcStellar.address,
      inputAmount,
      minOutputAmount,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 300),
      allowPartialFill: false,
      data: '0x',
    },
    raw: true, // walletProvider is FORBIDDEN here — TypeScript rejects it
  });

  if (!result.ok) {
    fail('createIntent returned an error (handled, not thrown):');
    payload((result.error as { toJSON?: () => unknown }).toJSON?.() ?? result.error);
    note('This is the v2 error model — branch on result.ok, never try/catch across a call.');
    return;
  }

  const { tx, intent, relayData } = result.value;
  ok('Unsigned intent built. The spoke transaction a wallet would sign:');
  const evmTx = tx as EvmRawTransaction; // { from, to, value, data } — note: no chainId
  payload({ from: evmTx.from, to: evmTx.to, value: evmTx.value, data: trunc(evmTx.data, 42) });
  note(`intent.intentId present: ${Boolean((intent as { intentId?: unknown }).intentId)}` +
    `  ·  relayData.payload bytes: ${(relayData.payload?.length ?? 0)}`);

  raw(c.gray('  ┆'));
  info('The reverse — Stellar → Arbitrum — is the same shape (Stellar account signs an XDR):');
  payload({
    srcChainKey: ChainKeys.STELLAR_MAINNET,
    dstChainKey: ChainKeys.ARBITRUM_MAINNET,
    srcAddress: 'G…(funded Stellar account)',
    inputToken: usdcStellar.address,
    outputToken: usdcArb.address,
    note: 'executing this needs a funded mainnet Stellar account + a trustline',
  });
}

// ── Scene 7: the Stellar trustline story ─────────────────────────────────────
export async function sceneTrustline(sodax: Sodax): Promise<void> {
  scene(
    'The Stellar trustline gate',
    'A Stellar account must trust a (non-XLM) asset before it can receive it — SODAX handles it.',
  );
  note('Before delivering a non-XLM asset to a Stellar destination, SODAX checks/creates a trustline.');
  raw(c.dim('    const stellar = sodax.spoke.getSpokeService(ChainKeys.STELLAR_MAINNET);'));
  raw(c.dim('    await stellar.hasSufficientTrustline(token, amount, "G…");  // Promise<boolean>'));
  note('Missing trustline surfaces as a typed VALIDATION_FAILED (context.reason = "trustlineMissing"),');
  note('and the standard remedy is the feature-level approve() flow, which establishes it as a side effect.');

  // Demonstrate the read against a throwaway (unfunded) account — expected to be false / error-handled.
  const usdc = sodax.config.findSupportedTokenBySymbol(ChainKeys.STELLAR_MAINNET, 'USDC');
  if (!usdc) {
    info('USDC not in Stellar config — skipping the live trustline read.');
    return;
  }
  try {
    const stellar = sodax.spoke.getSpokeService(ChainKeys.STELLAR_MAINNET) as StellarSpokeService;
    const probe = Keypair.random().publicKey();
    const has = await stellar.hasSufficientTrustline(usdc.address, pow10(usdc.decimals), probe);
    ok(`hasSufficientTrustline(USDC, 1, <fresh account>) → ${has ? c.green('true') : c.yellow('false')}` +
      `  ${c.dim('(false = would need a trustline first)')}`);
  } catch (e) {
    info(`Live trustline read unavailable here (${(e as Error).message.slice(0, 60)}…) — the API shape stands.`);
  }
}

// ── Scene 8: capability matrix (talking-point visual) ────────────────────────
export function sceneCapabilityMatrix(): void {
  scene(
    'What you can ship on Stellar with SODAX',
    'Every row works with Stellar as source AND as destination.',
  );
  table(
    ['CAPABILITY', 'STELLAR AS SOURCE', 'STELLAR AS DESTINATION'],
    [
      ['Swap', 'sign XDR, route out', 'deliver asset (needs trustline)'],
      ['Bridge', 'lock on Stellar', 'release to G… recipient'],
      ['Money market', 'supply / repay from G…', 'borrow / withdraw to G…'],
      ['Staking', 'via hub abstraction', 'via hub abstraction'],
    ],
    [14, 24, 32],
  );
  note('All of the above is mainnet-only at the protocol level (no testnet hub exists).');
}

// ── helpers ──────────────────────────────────────────────────────────────────
function formatUnits(v: bigint, decimals: number): string {
  const neg = v < 0n;
  const s = (neg ? -v : v).toString().padStart(decimals + 1, '0');
  const i = s.slice(0, s.length - decimals) || '0';
  const f = s.slice(s.length - decimals).replace(/0+$/, '');
  const out = f ? `${i}.${f}` : i;
  return neg ? `-${out}` : out;
}
function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
function truncMid(s: string, n: number): string {
  if (s.length <= n) return s;
  const half = Math.floor((n - 1) / 2);
  return s.slice(0, half) + '…' + s.slice(s.length - half);
}
