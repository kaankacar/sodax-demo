'use client';

import { usePools, usePoolData } from '@sodax/dapp-kit';
import type { PoolKey, PoolData } from '@sodax/sdk';

const DYNAMIC_FEE = 8388608; // 0x800000 — PancakeSwap-Infinity dynamic-fee sentinel
const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—');
// totalLiquidity is the concentrated-liquidity value L (sqrt-price derived) — NOT a
// token/USD amount. Show its raw magnitude honestly rather than implying decimals.
const fmtLiq = (v: bigint | undefined) => {
  if (v === undefined) return '—';
  const n = Number(v);
  return n >= 1e7 ? n.toExponential(2) : n.toLocaleString();
};

export function DexPools() {
  const { data: pools, isLoading, error } = usePools();
  const list = (pools ?? []) as PoolKey[];

  return (
    <div className="card full">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>DEX — concentrated liquidity</h3>
        <span className="tag live">{list.length || '…'} pools · live state</span>
      </div>
      <p className="sub">PancakeSwap-Infinity-style CL pools on the hub. Each row reads live on-chain state.</p>
      <div className="scroll">
        <table className="t">
          <thead><tr><th>Pair</th><th>Fee</th><th>Tick spacing</th><th>Active liquidity (L)</th><th>Status</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5}>loading pools…</td></tr>}
            {error && <tr><td colSpan={5}>failed to load pools</td></tr>}
            {!isLoading && list.length === 0 && <tr><td colSpan={5}>no pools configured</td></tr>}
            {list.map((pool) => <PoolRow key={`${pool.currency0}-${pool.currency1}-${pool.fee}`} pool={pool} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PoolRow({ pool }: { pool: PoolKey }) {
  const { data } = usePoolData({ params: { poolKey: pool } });
  const d = data as PoolData | undefined;
  const pair = d ? `${d.token0.symbol} / ${d.token1.symbol}` : `${short(pool.currency0)} / ${short(pool.currency1)}`;
  const fee = Number(pool.fee) === DYNAMIC_FEE ? 'Dynamic' : `${Number(pool.fee) / 10_000}%`;
  return (
    <tr>
      <td className="sym">{pair}</td>
      <td>{fee}</td>
      <td>{d?.tickSpacing ?? '—'}</td>
      <td>{fmtLiq(d?.totalLiquidity)}</td>
      <td>{d ? (d.isActive ? '🟢 active' : '⚪ inactive') : '…'}</td>
    </tr>
  );
}
