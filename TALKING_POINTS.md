# SODAX × Stellar — meeting cheat-sheet

A tight script for introducing the SODAX SDK to Stellar developers. ~15–20 min with demos.

---

## 1. The one-liner

> SODAX is **execution infrastructure for modern money** — one SDK to **swap, bridge, and
> lend/borrow across 20 chains**, with **Stellar as a first-class spoke**. You keep your UX;
> SODAX coordinates liquidity, timing, and recovery so cross-network actions actually complete.

## 2. Why a Stellar dev should care

- **Reach without leaving Stellar.** A Stellar account can be the **source or destination**
  of a swap, bridge, or money-market action across EVM chains, Solana, Sui, Bitcoin, etc.
- **One integration, not N bridges.** The SDK abstracts the hub (Sonic) + solver + relay.
- **Stellar-native primitives respected** — trustlines, XDR signing, Horizon — via a real
  `StellarWalletProvider` backed by `@stellar/stellar-sdk`, and Freighter/xBull/Lobstr in the browser.

## 3. The numbers (live, from the SDK)

- **20** connected chains (1 hub + 19 spokes). Stellar = `ChainKeys.STELLAR_MAINNET` (`'stellar'`).
- **25** money-market reserve assets, markets on **20** chains.
- **4** Stellar assets wired today: **XLM, bnUSD, USDC, SODA**.
- Live example pulled on stage: **~10,389 USDC** bridgeable Arbitrum → Stellar (a real limit).

## 4. Live demo script

**A. The CLI tour (do this first — it never fails, needs no funds):**
```bash
pnpm tour
```
Narrate as it scrolls:
- "One `new Sodax()` and an `initialize()` — now I have swaps, money market, bridge, staking, dex."
- Scene 5: "this bridgeable number is a **live read** from the backend."
- Scene 6: "here's the **unsigned** cross-chain swap payload — exactly what a wallet signs."
- **Scene 9 is the money shot**: "this is the **real** SODAX `StellarWalletProvider` signing a
  `changeTrust` on Stellar testnet, broadcasting it, and the asset landing — **real tx hashes**,
  click through to Stellar Expert." (friendbot funds it — zero setup.)

**B. The web dApp:**
```bash
pnpm web   # http://localhost:3000
```
- Click **Connect Freighter** → show the address.
- Type an amount in the swap panel → **live quote** appears (Stellar USDC → Arbitrum USDC).
- Show the money-market panel's **live APYs** and (once connected) the portfolio summary.

## 5. The honest caveat (say it plainly)

> "SODAX's protocol is **mainnet-only** — there's no testnet hub. So a *real* cross-chain swap
> moves real funds. In this demo, mainnet execution is **disarmed by default**; the *signing*
> we just watched is on Stellar testnet to prove the wallet provider end-to-end with no funds."

This builds trust and pre-empts the obvious "is this moving real money?" question.

## 6. Gotchas worth flagging to the room (developer credibility)

- **`Result<T>`, not exceptions** — `if (!res.ok) handle(res.error)`. The SDK never throws across a call.
- **No testnet chain keys.** `ChainKeys.*` are all `_MAINNET`. `network: 'TESTNET'` is a *wallet
  provider* setting (which Stellar network the account is on), not a SODAX protocol environment.
- **The Stellar private key is a secret seed (`S…`)**, not a `0x` hex key — despite the `Hex`
  TypeScript type. The provider calls `Keypair.fromSecret()`. (Easy 20-minute bug to avoid.)
- **Trustlines first.** A Stellar account must trust a non-XLM asset before it can receive it;
  SODAX establishes it through the feature `approve()` flow. Missing → typed `VALIDATION_FAILED`.
- **`createIntent` wants token *address strings***, not `XToken` objects; `data: '0x'` is required.
- **Web**: provider order `SodaxProvider › QueryClientProvider › SodaxWalletProvider`, and the
  wagmi-backed providers must be **client-only** (they can't be server-prerendered).

## 7. Likely questions → crisp answers

- **"Is Stellar really supported or just listed?"** — Real: dedicated `StellarWalletProvider`,
  trustline handling, XDR signing, 4 live assets, and a Stellar spoke service. We signed a real
  testnet tx live.
- **"How does settlement work?"** — Intent-based: you sign on the spoke; it relays to the Sonic
  hub; an off-chain **solver** fills on the destination; `postExecution` finalizes. The SDK
  surfaces `intentDeliveryInfo` (src/dst tx hashes).
- **"Custody?"** — Non-custodial: the user signs with their own wallet (Freighter/key); SODAX
  builds payloads and coordinates relay/solver.
- **"Can I just read data without a wallet?"** — Yes — chains, tokens, reserves, bridgeable
  limits, quotes, and *building* unsigned intents all work with no wallet.
- **"How do I build with this fast?"** — `@sodax/dapp-kit` ships React hooks
  (`useSwap`, `useQuote`, `useSupply`, `useReservesHumanized`, …). There's also `@sodax/skills`
  (AI-agent knowledge) for agent-assisted integration.

## 8. Call to action

- Docs: **docs.sodax.com**. Install: `pnpm add @sodax/sdk @sodax/wallet-sdk-core`.
- For dApps: add `@sodax/dapp-kit @sodax/wallet-sdk-react`.
- "Clone this repo, run `pnpm tour`, and you've seen the whole surface in two minutes."
