'use client';

import { useReservesUsdFormat, useSodaxContext } from '@sodax/dapp-kit';
import { ChainKeys } from '@sodax/sdk';
import { chainMeta, tokenLink, fmtPct, fmtUsd, shortAddr } from '../lib/sodax';

type Reserve = {
  symbol?: string;
  name?: string;
  underlyingAsset?: string;
  supplyAPY?: string | number;
  variableBorrowAPY?: string | number;
  totalLiquidityUSD?: string | number;
  totalDebtUSD?: string | number;
};

export function MoneyMarketAssets() {
  const { sodax } = useSodaxContext();
  const { data, isLoading } = useReservesUsdFormat();
  const reserves = (Array.isArray(data) ? data : []) as Reserve[];
  // Reserves live on the Sonic hub — link each underlying asset to the Sonic explorer.
  const sonic = chainMeta(sodax, ChainKeys.SONIC_MAINNET);

  const sorted = [...reserves].sort(
    (a, b) => Number(b.totalLiquidityUSD ?? 0) - Number(a.totalLiquidityUSD ?? 0),
  );

  return (
    <div className="card full">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Money market — all assets</h3>
        <span className="tag live">{reserves.length || '…'} reserves · live</span>
      </div>
      <p className="sub">Every reserve in the SODAX money market, with live supply/borrow APYs. Click an asset to view it on the Sonic hub explorer.</p>

      <div className="scroll">
        <table className="t">
          <thead>
            <tr>
              <th>Asset</th><th>Supply APY</th><th>Borrow APY</th><th>Total supplied</th><th>Hub address</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && sorted.length === 0 && <tr><td colSpan={5}>loading reserves…</td></tr>}
            {!isLoading && sorted.length === 0 && <tr><td colSpan={5}>no reserves in the active config</td></tr>}
            {sorted.map((r, i) => {
              const addr = r.underlyingAsset ?? '';
              const href = tokenLink(sonic, addr);
              return (
                <tr key={addr || i}>
                  <td className="sym">{r.symbol ?? '—'}</td>
                  <td>{fmtPct(r.supplyAPY)}</td>
                  <td>{fmtPct(r.variableBorrowAPY)}</td>
                  <td>{fmtUsd(r.totalLiquidityUSD)}</td>
                  <td>{href ? <a href={href} target="_blank" rel="noreferrer">{shortAddr(addr)} ↗</a> : shortAddr(addr)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
