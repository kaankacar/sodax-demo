'use client';

import { useBackendOrderbook } from '@sodax/dapp-kit';

type Entry = {
  intentData?: {
    intentId?: string | number;
    inputAmount?: string;
    minOutputAmount?: string;
    allowPartialFill?: boolean;
    srcChain?: number;
    dstChain?: number;
  };
};
type Book = { total?: number; data?: Entry[] };

const short = (v: unknown) => { const s = String(v ?? ''); return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s; };
const trunc = (s: string | undefined, n = 10) => (s && s.length > n ? `${s.slice(0, n)}…` : s ?? '—');

export function Orderbook() {
  const { data } = useBackendOrderbook({ params: { pagination: { offset: '0', limit: '8' } } }) as { data?: Book };
  const rows = data?.data ?? [];

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Live solver orderbook</h3>
        <span className="tag live">{data?.total ?? '…'} open</span>
      </div>
      <p className="sub">Real intents waiting for solver fills across the network, right now.</p>
      <div className="scroll" style={{ maxHeight: 240 }}>
        <table className="t">
          <thead><tr><th>Intent</th><th>Input</th><th>Min out</th><th>Partial</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4}>loading orderbook…</td></tr>}
            {rows.map((e, i) => (
              <tr key={String(e.intentData?.intentId ?? i)}>
                <td className="sym">{short(e.intentData?.intentId)}</td>
                <td>{trunc(e.intentData?.inputAmount)}</td>
                <td>{trunc(e.intentData?.minOutputAmount)}</td>
                <td>{e.intentData?.allowPartialFill ? 'yes' : 'no'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">SDK: <code>sodax.backendApi.getOrderbook()</code> · hook <code>useBackendOrderbook</code>. Track your own with <code>useStatus</code> / <code>useBackendUserIntents</code>.</p>
    </div>
  );
}
