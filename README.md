# SODAX × Stellar — SDK demo

**▶ Live demo: https://kaankacar.github.io/sodax-demo/** (auto-deploys from `main` via GitHub Actions)

A hands-on showcase of the [**SODAX SDK**](https://docs.sodax.com/) built for a Stellar
developer audience. SODAX is *execution infrastructure for modern money*: one SDK that
coordinates **swaps, bridging, and a cross-chain money market** across **20 networks**,
settling on a hub chain (Sonic). **Stellar is a first-class spoke** — this repo proves it.

Two complementary pieces:

| | What it is | Best for |
|---|---|---|
| `apps/tour` | A narrated **CLI tour** of the SDK (TypeScript, `tsx`) | A bulletproof, zero-funds live walkthrough in a terminal |
| `apps/web` | A **Next.js dApp** (`@sodax/dapp-kit` + `@sodax/wallet-sdk-react`) | The visual demo — connect Freighter, live quotes & rates |

Everything talks to **real, live SODAX endpoints**. The CLI tour additionally performs
**real signed transactions on the Stellar testnet** (friendbot-funded — no wallet or
funds required).

---

## Quick start

```bash
# from the repo root
pnpm install

# 1) The CLI tour — runs against live SODAX + signs real Stellar testnet txs
pnpm tour

# 2) The web dApp — http://localhost:3000
pnpm web
```

> Requires Node ≥ 20.12 and pnpm. No configuration needed — copy `.env.example` to
> `.env` only if you want to point at specific accounts or arm live mainnet execution.

---

## What the CLI tour shows (`pnpm tour`)

Ten scenes, each a small, readable slice of the SDK. Every call uses the v2 `Result<T>`
model (branch on `result.ok` — the SDK never throws across a call):

1. **Initialize** — `new Sodax()` + `await sodax.config.initialize()`.
2. **Network graph** — all 20 spokes; Stellar confirmed as `ChainKeys.STELLAR_MAINNET`.
3. **Stellar assets** — the real swap-routable tokens (XLM, bnUSD, USDC, SODA) with contract ids.
4. **Money market** — 25 reserve assets across 20 chains; Stellar lend/borrow assets.
5. **Bridgeable liquidity** — live `getBridgeableAmount(USDC Arbitrum → USDC Stellar)`.
6. **Build a swap intent** — `createIntent({ raw: true })` prints the *unsigned* payload.
7. **Trustline gate** — the Stellar-specific precondition, and how SODAX handles it.
8. **Capability matrix** — what you can ship on Stellar (swap / bridge / lend, src & dst).
9. **REAL testnet signing** — the actual `StellarWalletProvider` signs a `changeTrust`,
   broadcasts it, waits for the receipt, then an issuer delivers the asset. **Live tx hashes.**
10. **Live mainnet execution** — a real cross-chain swap, **disarmed by default** (see below).

## What the web dApp shows (`pnpm web`)

A guided "what can I do with SODAX" surface — most of it **live with no wallet**:

- **Multi-chain connect** — EVM (MetaMask/injected) + Stellar (Freighter/xBull/Lobstr), so swaps
  can execute from any source chain.
- **Network graph** — all 20 connected chains (hub + spokes), each linked to its block explorer.
- **Cross-chain swap (any route)** — source/destination **chain + token dropdowns** populated
  from the SDK; a **live solver quote** for *any* supported spoke→spoke pair (verified across
  Stellar↔EVM, EVM→Solana, native ETH, same-chain). Execution signs on the source chain.
- **Bridge limits** — interactive `getBridgeableAmount` reader (USDC into Stellar from any chain).
- **Live solver orderbook** — real open intents network-wide (`useBackendOrderbook`).
- **Your balances** — live on-chain balances for the connected account (`useXBalances`).
- **Money market — all assets** — the full table of all **26 reserves** with live supply/borrow
  APYs, TVL, and a link to each asset on the Sonic hub explorer. Plus a supply panel + your
  portfolio summary once connected.
- **Staking** — live vault exchange rate (xSODA↔SODA), stake/instant-unstake ratios, cooldown, penalty.
- **DEX — concentrated liquidity** — live CL pools (`usePools` + `usePoolData`): pair, dynamic fee,
  tick spacing, active liquidity, status.
- **Token explorer** — pick any chain, browse the assets SODAX routes there, each linked to that
  chain's explorer (Soroban contract pages for Stellar).
- **Capabilities** — swap, bridge, money market, staking, DEX/liquidity, limit orders & migration.

All read data comes straight off the SDK hooks (`useSodaxContext`, `useQuote`, `useReservesUsdFormat`,
`usePools`/`usePoolData`, `useStakingConfig`/`useStakeRatio`/`useConvertedAssets`, `useBackendOrderbook`,
`useXBalances`, `useGetBridgeableAmount`, …). Every capability was runtime-verified against live mainnet.
Build it for production with `pnpm web:build` (verified).

---

## Live mainnet execution (real funds, opt-in)

SODAX's protocol is **mainnet-only** — there are no testnet chain keys, so a *real*
cross-chain swap can only happen on mainnet. The tour wires this fully but keeps it
**disarmed**. It fires **only** when **both**:

1. `SODAX_EXECUTE=1`, and
2. a funded mainnet key is present (`STELLAR_MAINNET_SECRET` and/or `EVM_MAINNET_PRIVATE_KEY`).

There is **no amount cap** — `SODAX_SWAP_AMOUNT` (default `0.5` USDC) is exactly what moves.
With neither set, the tour only *builds* the unsigned intent and prints it. See `.env.example`.

---

## Repo layout

```
sodax-demo/
├─ apps/
│  ├─ tour/                 # CLI tour (tsx)
│  │  └─ src/
│  │     ├─ index.ts        # scene orchestrator (per-scene error isolation)
│  │     ├─ sodaxClient.ts  # new Sodax() + initialize()
│  │     ├─ scenes.ts       # read surface + unsigned intent + trustline + matrix
│  │     ├─ testnet.ts      # REAL Stellar testnet signing via StellarWalletProvider
│  │     ├─ mainnet.ts      # gated live mainnet execution
│  │     ├─ env.ts / ui.ts  # config + terminal styling
│  └─ web/                  # Next.js App Router dApp
│     ├─ app/               # layout, providers, page
│     ├─ components/        # Header, SwapPanel, MoneyMarketPanel, Capabilities, …
│     └─ lib/               # demo constants + helpers
├─ .env.example
├─ TALKING_POINTS.md        # the meeting cheat-sheet
└─ README.md
```

## SDK cheat-sheet (the things that bite)

- **Result, not throw** — `if (!res.ok) { res.error.toJSON() }`. Applies to every SDK call.
- **`ChainKeys.*` are all `_MAINNET`** — there is no `STELLAR_TESTNET`. The `network: 'TESTNET'`
  option lives on the *Stellar wallet provider*, not the protocol.
- **`StellarWalletProvider` private key is a Stellar secret seed (`S…`)**, not a `0x` hex key —
  even though the TS type says `Hex`. It runs `Keypair.fromSecret()` internally.
- **`createIntent` takes token *address strings*** (not `XToken` objects); `data: '0x'` is required.
- **Stellar destinations need a trustline** before receiving a non-XLM asset; SODAX establishes
  it via the feature `approve()` flow.
- **dApp hooks**: mutation hooks expose `mutateAsyncSafe` (returns `Result`, never rejects);
  `useXConnect` is a plain mutation (`mutateAsync` throws — `.catch` it). Provider order is
  `SodaxProvider › QueryClientProvider › SodaxWalletProvider`, mounted **client-only**.

## Packages

All `@sodax/*` are pinned to `2.0.0-rc.1`:
`@sodax/sdk`, `@sodax/types`, `@sodax/wallet-sdk-core`, `@sodax/wallet-sdk-react`, `@sodax/dapp-kit`.

> Source of truth: [docs.sodax.com](https://docs.sodax.com/). SODAX also ships an
> `@sodax/skills` package (AI-agent knowledge for the SDK) — handy if you build with an agent.
