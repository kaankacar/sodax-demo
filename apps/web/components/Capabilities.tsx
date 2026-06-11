const ITEMS = [
  {
    title: 'Swap',
    body: 'Intent-based cross-chain swaps. Stellar as source (your wallet signs an XDR) or destination (asset delivered to a G-address).',
    tag: 'sodax.swaps',
  },
  {
    title: 'Bridge',
    body: 'Move a token across the 20-chain graph. Live bridgeable limits, relay + settlement handled on the Sonic hub.',
    tag: 'sodax.bridge',
  },
  {
    title: 'Money market',
    body: 'Supply on one chain, borrow the delivery on another. 26 reserve assets, one position abstracted on the hub.',
    tag: 'sodax.moneyMarket',
  },
  {
    title: 'Staking',
    body: 'Stake SODA for protocol rewards, unstake over a cooldown, or claim. Config + flows exposed directly.',
    tag: 'sodax.staking',
  },
  {
    title: 'DEX / liquidity',
    body: 'Concentrated-liquidity pools (PancakeSwap Infinity-style): provide liquidity, manage positions, claim fees.',
    tag: 'sodax.dex',
  },
  {
    title: 'Limit orders & more',
    body: 'Limit orders, gas estimation, partner fees, recovery, and migration (ICX / BALN / bnUSD) — all in one SDK.',
    tag: 'sodax.swaps.createLimitOrder',
  },
];

export function Capabilities() {
  return (
    <div className="card full" style={{ marginTop: 18 }}>
      <h3>What you can ship on Stellar</h3>
      <p className="sub">Every capability treats Stellar as a first-class spoke — as source and as destination.</p>
      <div className="grid-3">
        {ITEMS.map((it) => (
          <div key={it.title} className="card" style={{ background: 'var(--card-2)' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{it.title}</strong>
              <span className="tag">{it.tag}</span>
            </div>
            <p className="note" style={{ marginTop: 8 }}>{it.body}</p>
          </div>
        ))}
      </div>
      <p className="note">
        Heads-up: SODAX&apos;s protocol is mainnet-only — there are no testnet chain keys. Live quotes, rates, and
        limits above are real; executing a swap or supply moves real funds.
      </p>
    </div>
  );
}
